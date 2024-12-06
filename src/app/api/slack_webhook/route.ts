import axios from "axios";
import { NextResponse } from "next/server";
// const id: string = process.env.NEXT_PUBLIC_SLACK_BOT_ID!;
import crypto from "crypto";
const processedEvents: Record<string, number> = {};

async function getOpenAIResponse(userMessage: string) {
  const response = await axios.post(
    "https://api.openai.com/v1/chat/completions",
    {
      model: "gpt-4o",
      messages: [{ role: "user", content: userMessage }],
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_KEY}`,
      },
    }
  );
  return response.data.choices[0].message.content;
}

async function checkBotStatus(userId: string) {
  const status = await axios.get(
    `https://slack.com/api/users.info?user=${userId}`,
    {
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SLACK_CHANNEL_ACCESS_TOKEN}`,
      },
    }
  );
  console.log("status: ", status);
  return status;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const timestamp = req.headers.get("x-slack-request-timestamp");
  const signature = req.headers.get("x-slack-signature");

  if (!timestamp || !signature) {
    return NextResponse.json({ error: "Missing headers" }, { status: 400 });
  }

  const currentTime = Math.floor(Date.now() / 1000);
  if (Math.abs(currentTime - parseInt(timestamp)) > 300) {
    return NextResponse.json(
      { error: "Request timestamp expired" },
      { status: 400 }
    );
  }
  const baseString = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac("sha256", "bf70159e7abaf31fd077d8095501ad1a");
  hmac.update(baseString);
  const computedSignature = `v0=${hmac.digest("hex")}`;

  if (computedSignature !== signature) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  const payload = await JSON.parse(rawBody);
  console.log("Payload :", payload);
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }
  // Handle other events (e.g., messages)
  if (payload.event) {
    const event = payload.event;

    // Ignore bot messages
    if (event.bot_id) {
      return NextResponse.json({ status: "ignored" });
    }

    // Prevent duplicate processing of events
    const eventId = payload.event_id;
    const currentTime = Date.now();
    if (processedEvents[eventId]) {
      console.log(`Ignoring duplicate event: ${eventId}`);
      return NextResponse.json({ status: "duplicate" });
    }

    processedEvents[eventId] = currentTime;

    // Clean up old events
    for (const oldEventId in processedEvents) {
      if (currentTime - processedEvents[oldEventId] > 60 * 1000) {
        delete processedEvents[oldEventId];
      }
    }

    // Handle direct messages
    if (event.type === "message" && event.channel_type === "im") {
      const userMessage = event.text;
      const userId = event.user;
      // const channel = event.channel;

      console.log(`Received DM from user ${userId}: ${userMessage}`);

      const responseText = await getOpenAIResponse(userMessage);
      await axios.post(
        "https://slack.com/api/chat.postMessage",
        {
          channel: event.channel,
          text: responseText,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SLACK_CHANNEL_ACCESS_TOKEN}`,
            "Content-Type": "application/json",
          },
        }
      );

      return NextResponse.json({ status: "ok" });
    }

    // Handle mentions in channels
    if (event.type === "message" && event.channel_type === "channel") {
      const userMessage = event.text;
      const userId = event.user;
      const channel = event.channel;
      const userMessages = userMessage.replace(/<@([A-Z0-9]+)>/g, "").trim();
      const mentions = userMessage.match(/<@([A-Z0-9]+)>/) || [];
      // const mentioned = msg.match(/<@([A-Z0-9]+)>/g) || [];
      const botStaus = await checkBotStatus(mentions[1]);
      // Check if the bot is mentioned
      console.log("botStaus: ", botStaus);
      if (botStaus) {
        console.log(
          `Bot mentioned by user ${userId} in channel ${channel}: ${userMessages}`
        );
        const responseText = await getOpenAIResponse(userMessages);
        await axios.post(
          "https://slack.com/api/chat.postMessage",
          {
            channel: event.channel,
            text: `<@${userId}> ${responseText}`,
          },
          {
            headers: {
              Authorization: `Bearer ${process.env.NEXT_PUBLIC_SLACK_CHANNEL_ACCESS_TOKEN}`,
              "Content-Type": "application/json",
            },
          }
        );
        return NextResponse.json({ status: "ok" });
      }
    }
  }
  return NextResponse.json({ status: "No action taken" });
}
