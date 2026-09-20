import nodemailer from "nodemailer";

/** Tên người dùng tự nhập — phải escape trước khi chèn vào HTML email. */
function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function sendVerificationEmail(email: string, token: string) {
  const verifyLink = `${process.env.NEXTAUTH_URL}/verify-email?token=${token}`;

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Xác nhận email đăng ký tài khoản",
      html: `
        <h2>Xác nhận Email</h2>
        <p>Cảm ơn bạn đã đăng ký! Vui lòng nhấp vào liên kết dưới để xác nhận email:</p>
        <a href="${verifyLink}" style="display: inline-block; padding: 10px 20px; background-color: #22c55e; color: white; text-decoration: none; border-radius: 5px;">
          Xác nhận Email
        </a>
        <p>Hoặc sao chép link này: ${verifyLink}</p>
        <p>Link này sẽ hết hạn sau 24 giờ.</p>
      `,
    });
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, name: string) {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Tài khoản của bạn đã được kích hoạt",
      html: `
        <h2>Chào mừng, ${escapeHtml(name)}!</h2>
        <p>Tài khoản của bạn đã được kích hoạt thành công.</p>
        <p>Bạn có thể đăng nhập tại: <a href="${process.env.NEXTAUTH_URL}/dang-nhap">${process.env.NEXTAUTH_URL}/dang-nhap</a></p>
      `,
    });
    return true;
  } catch (error) {
    console.error("Email send error:", error);
    return false;
  }
}
