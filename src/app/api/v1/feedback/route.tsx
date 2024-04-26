import { NextResponse } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const serviceId: string = process.env.SERVICE_ID!;
const templateId: string = process.env.TEMPLATE_ID!;
const emailJsPublicKey: string = process.env.EMAILJS_PUBLIC_KEY!;
const emailJsUrl: string = process.env.EMAILJS_URL!;
const emailJsPrivateKey: string = process.env.EMAILJS_PRIVATE_KEY!;

type ValidationErrors = {
  path: string;
  message: string;
};

type ErrorResponse = {
  errorMessage: string;
  validationErrors?: ValidationErrors[];
};

enum FeedbackType {
  Positive = "positive",
  Negative = "negative",
}

const requestSchema = z.object({
  page: z.string(),
  product: z.string(),
  option: z.string(),
  feedbackType: z.nativeEnum(FeedbackType),
  feedbackComment: z.string().optional(),
});

type Response = {
  Success: string;
};

export async function POST(
  req: Request,
  res: NextResponse<Response | ErrorResponse>
) {
  try {
    const body = await req.json();

    // validation based on zod schema
    const validation = requestSchema.safeParse(body);

    if (!validation.success) {
      const validationErrors: z.ZodError = validation.error;

      const err = validationErrors.issues.map((e) => ({
        path: e.path[0],
        message: e.message,
      }));

      return new NextResponse(
        JSON.stringify({
          errorMessage: "validation failure",
          validationErrors: err,
        }),
        {
          status: 400,
          statusText: "Bad Request",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    var data = {
      service_id: serviceId,
      template_id: templateId,
      user_id: emailJsPublicKey,
      accessToken: emailJsPrivateKey,
      template_params: body,
    };

    const response = await fetch(emailJsUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        // Include other headers as required by the API
        // 'Authorization': 'Bearer <Your_Token_Here>',
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      // If the response is not 2xx, it throws an error
      return new NextResponse(
        JSON.stringify({
          errorMessage: "Failed to register feedback",
        }),
        {
          status: 502,
          statusText: "Bad Gateway",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new NextResponse(
      JSON.stringify({
        success: "true",
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (err) {
    return new NextResponse(
      JSON.stringify({
        errorMessage: "Internal Server Error. Please try again later.",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}
