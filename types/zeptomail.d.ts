declare module "zeptomail" {
  export class SendMailClient {
    constructor(opts: { url: string; token: string });
    sendMail(payload: any): Promise<any>;
  }
}