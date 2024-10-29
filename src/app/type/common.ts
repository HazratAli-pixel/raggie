export type LineRES = {
  body: LineRESPONSE;
};

export type LineRESPONSE = {
  events: [
    {
      type: string;
      message: {
        type: string;
        id: string;
        text: string;
      };
      timestamp: number;
      source: {
        type: string;
        userId: string;
      };
      replyToken: string;
      mode: string;
      webhookEventId: string;
      deliveryContext: {
        isRedelivery: boolean;
      };
    },
    {
      type: string;
      timestamp: number;
      source: {
        type: string;
        userId: string;
      };
      replyToken: string;
      mode: string;
      webhookEventId: string;
      deliveryContext: {
        isRedelivery: false;
      };
    },
    {
      type: string;
      timestamp: number;
      source: {
        type: string;
        userId: string;
      };
      mode: string;
      webhookEventId: string;
      deliveryContext: {
        isRedelivery: false;
      };
    }
  ];
};
