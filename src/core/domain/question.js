export class IncomingQuestion {
  /**
   * @param {{ text: string, userId: string, channel?: string, chatId?: string|number }} p
   */
  constructor({ text, userId, channel = "telegram", chatId = null }) {
    this.text = text;
    this.userId = String(userId);
    this.channel = channel;
    this.chatId = chatId;
    this.wantsReview = detectWantsReview(text);
  }
}

export class Answer {
  constructor({ text, sessionId, wantsReview }) {
    this.text = text;
    this.sessionId = sessionId;
    this.wantsReview = wantsReview;
  }
}

/** Явный запрос проверить данные на расхождения / ошибки */
export function detectWantsReview(text) {
  return /провер|аудит|свер|несоответств|расхожд|странн|ошибк|дубл/i.test(
    text || "",
  );
}
