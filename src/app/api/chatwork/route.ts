import axios from "axios";
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
  const response = await axios.get(`https://api.chatwork.com/v2/contacts`, {
    headers: {
      "X-ChatWorkToken": chatworkApiToken,
    },
  });
  const users: Usertype[] = response.data ?? [];
  if (users.length >= 1) {
    const username: Usertype | undefined = await users.find(
      (user) => user.account_id === userid
    );
    if (username) return username.name;
  }
}

export async function POST(req: Request) {
  const payload = await req.json();
  const userMessages: string = payload.webhook_event.body;
  const userMessage: string = userMessages.slice(12);

  if (payload.webhook_event_type === "mention_to_me") {
    const openAIResponse = await getOpenAIResponse(userMessage);

    const username = await getUserName(payload.webhook_event.from_account_id);
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

  return NextResponse.json({
    statusCode: 400,
    error: "Message content is required",
  });
}
