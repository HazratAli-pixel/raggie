import axios from "axios";
import crypto from "crypto";
import { NextResponse } from "next/server";

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
  const url = `https://slack.com/api/users.info?user=${userId}`;
  const headers = {
    Authorization: `Bearer ${process.env.NEXT_PUBLIC_SLACK_CHANNEL_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: headers,
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.user;
  } catch (error) {
    console.error("Error:", error);
  }
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
  if (payload.type === "url_verification") {
    return NextResponse.json({ challenge: payload.challenge });
  }
  if (payload.event) {
    const event = payload.event;

    if (event.bot_id) {
      return NextResponse.json({ status: "ignored" });
    }

    // Handle direct messages
    if (event.type === "message" && event.channel_type === "im") {
      const userMessage = event.text;
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
    if (event.type === "app_mention") {
      const userId = event.user;
      const userMessages = event.text.replace(/<@([A-Z0-9]+)>/g, "").trim();
      const mentions = event.text.match(/<@([A-Z0-9]+)>/) || [];
      const botStaus = await checkBotStatus(mentions[1]);
      console.log("botStaus: ", botStaus);
      if (botStaus.is_bot) {
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
}
