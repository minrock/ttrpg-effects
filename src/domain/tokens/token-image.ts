export const supportedTokenImageExtensions = ["png", "jpg", "jpeg", "webp", "gif"] as const;

export type SupportedTokenImageExtension = (typeof supportedTokenImageExtensions)[number];

export interface TokenOpenSuccess {
  readonly ok: true;
  readonly imagePath: string;
  readonly imageUrl: string;
}

export interface TokenOpenFailure {
  readonly ok: false;
  readonly error: string;
}

export type TokenOpenResult = TokenOpenSuccess | TokenOpenFailure;

export function isSupportedTokenImageExtension(extension: string): extension is SupportedTokenImageExtension {
  return supportedTokenImageExtensions.includes(extension.toLowerCase() as SupportedTokenImageExtension);
}
