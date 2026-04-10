import nodemailer from "nodemailer";

function createTransporter() {
  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export async function sendRegistrationEmail(to: string, fullName: string): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    console.warn("Email credentials not set, skipping email send");
    return;
  }

  const transporter = createTransporter();

  await transporter.sendMail({
    from: `"Smart Time Education" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Успешная регистрация — Smart Time Education",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #fffde7; border-radius: 12px; overflow: hidden;">
        <div style="background: #f9a825; padding: 30px; text-align: center;">
          <h1 style="color: #1a1a1a; margin: 0; font-size: 28px;">Smart Time Education</h1>
          <p style="color: #333; margin: 8px 0 0;">IELTS Preparation Platform</p>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="color: #1a1a1a;">Добро пожаловать, ${fullName}!</h2>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">
            Вы успешно зарегистрировались на платформе <strong>Smart Time Education</strong>.
          </p>
          <p style="color: #444; font-size: 16px; line-height: 1.6;">
            Теперь вы можете начать подготовку к экзамену IELTS — Speaking, Listening, Reading и Writing.
          </p>
          <div style="background: #fff8e1; border-left: 4px solid #f9a825; padding: 16px; margin: 24px 0; border-radius: 4px;">
            <p style="margin: 0; color: #555; font-size: 14px;">
              Если вы не регистрировались на нашем сайте, просто проигнорируйте это письмо.
            </p>
          </div>
          <p style="color: #444; font-size: 16px;">Удачи на экзамене!</p>
          <p style="color: #666; font-size: 14px; margin-top: 32px; border-top: 1px solid #eee; padding-top: 16px;">
            © ${new Date().getFullYear()} Smart Time Education. Все права защищены.
          </p>
        </div>
      </div>
    `,
  });
}
