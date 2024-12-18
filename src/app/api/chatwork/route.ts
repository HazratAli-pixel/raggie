import axios from "axios";
import crypto from "crypto";
import { NextResponse } from "next/server";

const chatworkApiToken = process.env.NEXT_PUBLIC_CHATWORK_TOKEN;
type Usertype = {
  account_id: number;
  room_id: number;
  name: string;
};

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

async function getUserName(userid: number) {
  const url = `https://api.chatwork.com/v2/contacts`;
  const headers = {
    "X-ChatWorkToken": chatworkApiToken ?? "",
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
    if (data.length >= 1) {
      const username: Usertype | undefined = await data.find(
        (user: Usertype) => user.account_id == userid
      );
      if (username) return username.name;
    }
  } catch (error) {
    console.error("Error:", error);
  }
}

export async function POST(req: Request) {
  const signature = req.headers.get("X-ChatWorkWebhookSignature") || "";
  const body = await req.text();
  console.log("signature: ", signature);
  const hash = crypto
    .createHmac("sha256", chatworkApiToken ?? "")
    .update(body)
    .digest("base64");
  console.log("hash: ", hash);
  // if (signature !== hash) {
  //   return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  // }
  const payload = await JSON.parse(body);
  console.log("paylooad: ", payload);

  const userMessages: string = payload.webhook_event.body;
  if (
    payload.webhook_event_type === "mention_to_me" &&
    payload.webhook_event.room_id != "377312248"
  ) {
    const userMessage = userMessages.replace(/^(\[To:\d+\]\w+)/, "").trim();
    const openAIResponse = await getOpenAIResponse(userMessage);

    const username = await getUserName(payload.webhook_event.from_account_id);
    console.log(
      "username: ",
      payload.webhook_event.to_account_id,
      "--",
      username
    );
    const chatworkRoomId = payload.webhook_event.room_id;

    try {
      await axios.post(
        `https://api.chatwork.com/v2/rooms/${chatworkRoomId}/messages`,
        new URLSearchParams({
          body: `[To:${payload.webhook_event.from_account_id}]${username}\n${openAIResponse}`,
        }).toString(),
        {
          headers: {
            "X-ChatWorkToken": chatworkApiToken,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      return NextResponse.json({
        statusCode: 200,
        openaiResponse: openAIResponse,
      });
    } catch (error) {
      console.error("Chatwork API Error:", error);
      return NextResponse.json({
        statusCode: 500,
        error: "An error occurred",
      });
    }
  }
  if (
    payload.webhook_event_type === "mention_to_me" &&
    payload.webhook_event.room_id === "377312248"
  ) {
    const openAIResponse = await getOpenAIResponse(userMessages);
    console.log("openAIResponse: ", openAIResponse);
    const chatworkRoomId = payload.webhook_event.room_id;
    console.log("chatworkRoomId: ", chatworkRoomId);

    try {
      await axios.post(
        `https://api.chatwork.com/v2/rooms/${chatworkRoomId}/messages`,
        new URLSearchParams({
          body: openAIResponse,
        }).toString(),
        {
          headers: {
            "X-ChatWorkToken": chatworkApiToken,
            "Content-Type": "application/x-www-form-urlencoded",
          },
        }
      );
      return NextResponse.json({
        statusCode: 200,
        openaiResponse: openAIResponse,
      });
    } catch (error) {
      console.error("Chatwork API Error:", error);
      return NextResponse.json({
        statusCode: 500,
        error: "An error occurred",
      });
    }
  }

  return NextResponse.json({
    statusCode: 400,
    error: "Message content is required",
  });
}
