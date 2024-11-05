import axios from "axios";
import { NextResponse } from "next/server";

const chatworkApiToken = process.env.NEXT_PUBLIC_CHATWORK_TOKEN;

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
type Usertype = {
  account_id: number,
  room_id: number,
  name: string,
  chatwork_id: string,
  organization_id: number,
  organization_name: string,
  department: string,
  avatar_image_url: string
  }
async function getUserName(userid: number) {

  const abc: Usertype[] = await axios.get(
    `https://api.chatwork.com/v2/contacts`,
    {
      headers: {
        "X-ChatWorkToken": chatworkApiToken,
      },
    }
  );
  const response = abc ?? []
  if(response.length>=1){
    const username: Usertype | undefined = response.find((user)=>user.account_id===userid)
    if(username)
    return username.name;
  }
  

}

export async function POST(req: Request) {
  const payload = await req.json();
  const userMessages: string = payload.webhook_event.body;
  const userMessage: string = userMessages.slice(12)
  console.log("Payload :", payload)

  if (payload.webhook_event_type === "mention_to_me" ) {

  // if (userMessage && payload.webhook_event.account_id != 9836088 ) {
    const openAIResponse = await getOpenAIResponse(userMessage);
    console.log("OpenAI Response: ", openAIResponse);

    const username = await getUserName(payload.webhook_event.from_account_id)
    const chatworkRoomId = payload.webhook_event.room_id;

    console.log("chatworkApiToken: ", chatworkApiToken);
    console.log("chatworkRoomId: ", chatworkRoomId);

    try {
      // Ensure body parameter is explicitly set as expected by Chatwork
      await axios.post(
        `https://api.chatwork.com/v2/rooms/${chatworkRoomId}/messages`,
        new URLSearchParams({ body: `[To:${payload.webhook_event.from_account_id}]${username}"\n"${openAIResponse}` }).toString(), // Correct format for sending `body` text
        {
          headers: {
            "X-ChatWorkToken": chatworkApiToken,
            "Content-Type": "application/x-www-form-urlencoded", // Needed for URL-encoded format
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