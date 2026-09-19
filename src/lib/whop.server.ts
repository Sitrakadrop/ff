import { getRequestHeader } from "@tanstack/react-start/server";

export type WhopIdentity = {
  id: string;
  name: string;
  plan: string;
};

type WhopJwtPayload = {
  sub?: string;
  user_id?: string;
  exp?: number;
};

const WHOP_PRODUCT_ID =
  process.env.WHOP_PRODUCT_ID ??
  "prod_JklFk53fvcISG";

function decodeJwtPayload(
  token: string,
): WhopJwtPayload | null {
  try {
    const parts = token.split(".");

    if (parts.length !== 3) {
      return null;
    }

    const payloadPart = parts[1];

    const normalizedPayload = payloadPart
      .replace(/-/g, "+")
      .replace(/_/g, "/");

    const paddedPayload =
      normalizedPayload +
      "=".repeat(
        (4 - (normalizedPayload.length % 4)) % 4,
      );

    const decodedPayload = Buffer.from(
      paddedPayload,
      "base64",
    ).toString("utf8");

    return JSON.parse(
      decodedPayload,
    ) as WhopJwtPayload;
  } catch {
    return null;
  }
}

async function getWhopUser(
  userId: string,
  apiKey: string,
): Promise<{
  id: string;
  name: string;
} | null> {
  try {
    const response = await fetch(
      `https://api.whop.com/api/v5/app/users/${encodeURIComponent(
        userId,
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      console.error(
        `[Smart Point] Whop user lookup failed: ${response.status}`,
      );

      return null;
    }

    const user =
      (await response.json()) as {
        id?: string;
        username?: string;
        name?: string;
      };

    return {
      id: user.id ?? userId,
      name:
        user.username ??
        user.name ??
        "Member",
    };
  } catch (error) {
    console.error(
      "[Smart Point] Whop user lookup failed:",
      error,
    );

    return null;
  }
}

async function hasWhopProductAccess(
  userId: string,
  apiKey: string,
): Promise<boolean> {
  try {
    const response = await fetch(
      `https://api.whop.com/api/v5/memberships?user_id=${encodeURIComponent(
        userId,
      )}&product_id=${encodeURIComponent(
        WHOP_PRODUCT_ID,
      )}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!response.ok) {
      const text = await response.text();

      console.error(
        `[Smart Point] Whop membership check failed: ${response.status}`,
        text,
      );

      return false;
    }

    const result =
      (await response.json()) as {
        data?: Array<{
          status?: string;
        }>;
      };

    const memberships =
      result.data ?? [];

    return memberships.some(
      (membership) => {
        const status =
          membership.status?.toLowerCase();

        return (
          status === "active" ||
          status === "trialing" ||
          status === "completed"
        );
      },
    );
  } catch (error) {
    console.error(
      "[Smart Point] Whop membership verification failed:",
      error,
    );

    return false;
  }
}

export async function resolveWhopIdentity(): Promise<WhopIdentity | null> {
  const token =
    getRequestHeader(
      "x-whop-user-token",
    ) ??
    getRequestHeader(
      "X-Whop-User-Token",
    );

  if (!token) {
    console.error(
      "[Smart Point] Missing x-whop-user-token.",
    );

    return null;
  }

  const apiKey =
    process.env.WHOP_API_KEY;

  if (!apiKey) {
    console.error(
      "[Smart Point] WHOP_API_KEY is missing.",
    );

    return null;
  }

  const jwtPayload =
    decodeJwtPayload(token);

  if (!jwtPayload) {
    console.error(
      "[Smart Point] Invalid Whop token.",
    );

    return null;
  }

  if (
    jwtPayload.exp &&
    jwtPayload.exp * 1000 < Date.now()
  ) {
    console.error(
      "[Smart Point] Whop token has expired.",
    );

    return null;
  }

  const userId =
    jwtPayload.sub ??
    jwtPayload.user_id;

  if (!userId) {
    console.error(
      "[Smart Point] Whop token does not contain a user ID.",
    );

    return null;
  }

  const user =
    await getWhopUser(
      userId,
      apiKey,
    );

  if (!user) {
    return null;
  }

  const hasAccess =
    await hasWhopProductAccess(
      user.id,
      apiKey,
    );

  if (!hasAccess) {
    console.error(
      `[Smart Point] User ${user.id} does not have access to product ${WHOP_PRODUCT_ID}.`,
    );

    return null;
  }

  return {
    id: user.id,
    name: user.name,
    plan: "Premium Member",
  };
}