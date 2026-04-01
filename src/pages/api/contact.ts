import type { APIRoute } from 'astro';

// 定义环境变量类型
interface Env {
  DB: D1Database;
  RESEND_API_KEY: string;
  CONTACT_EMAIL: string;
}

interface ContactFormData {
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
}

export const POST: APIRoute = async ({ request, locals }) => {
  console.log('API endpoint called');
  
  try {
    const data: ContactFormData = await request.json();
    console.log('Received data:', { name: data.name, email: data.email, subject: data.subject });
    
    const { name, email, phone, subject, message } = data;

    // 验证必填字段
    if (!name || !email || !subject || !message) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Please fill in all required fields.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 验证邮箱格式
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Please enter a valid email address.' 
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 获取环境变量
    const env = locals.runtime?.env as Env | undefined;
    const db = env?.DB;
    const apiKey = env?.RESEND_API_KEY;
    const contactEmail = env?.CONTACT_EMAIL;

    if (!db) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Database is not configured.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!apiKey || !contactEmail) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'Email service is not configured.'
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('Using API Key:', apiKey ? 'Yes' : 'No');
    console.log('Sending to:', contactEmail);

    // 1. 保存到 D1 数据库
    let inquiryId: number | null = null;
    try {
      const result = await db.prepare(
        `INSERT INTO inquiries (name, email, phone, subject, message, status) 
         VALUES (?, ?, ?, ?, ?, 'new')`
      ).bind(name, email, phone || '', subject, message).run();

      inquiryId = result.meta?.last_row_id || null;
      console.log('Saved to database, ID:', inquiryId);
    } catch (dbError) {
      console.error('Database error:', dbError);
      // 数据库错误不影响邮件发送
    }

    // 2. 发送邮件（使用 fetch 调用 Resend API）
    try {
      const emailResponse = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'Minetra Contact <onboarding@resend.dev>',
          to: [contactEmail],
          reply_to: email,
          subject: `[Minetra Inquiry] ${getSubjectLabel(subject)} - ${name}`,
          html: generateEmailHTML(data),
        }),
      });

      if (!emailResponse.ok) {
        const errorData = await emailResponse.json();
        console.error('Resend error:', errorData);
        return new Response(
          JSON.stringify({ 
            success: false, 
            message: 'Failed to send message. Please try again later.' 
          }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      const emailResult = await emailResponse.json();
      console.log('Email sent successfully:', emailResult.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Thank you for your message! We will get back to you within 24 hours.',
          inquiryId: inquiryId,
          emailId: emailResult.id 
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );

    } catch (emailError) {
      console.error('Email sending error:', emailError);
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Failed to send email. Please try again later.' 
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error('Server error:', error);
    console.error('Error stack:', (error as Error).stack);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Server error: ' + (error as Error).message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

function getSubjectLabel(subject: string): string {
  const labels: Record<string, string> = {
    'general': 'General Inquiry',
    'quote': 'Request Quote',
    'partnership': 'Partnership',
    'careers': 'Careers',
  };
  return labels[subject] || subject;
}

function generateEmailHTML(data: ContactFormData): string {
  const { name, email, phone, subject, message } = data;
  
  const dateStr = new Date().toLocaleString('en-US', { 
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <style>
        body { font-family: 'Montserrat', Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #1A1A1A; color: white; padding: 30px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; }
        .header p { margin: 10px 0 0; opacity: 0.8; }
        .content { background: #f9f9f9; padding: 30px; }
        .field { margin-bottom: 20px; }
        .label { font-weight: bold; color: #F5A623; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; }
        .value { margin-top: 5px; padding: 10px; background: white; border-left: 3px solid #F5A623; }
        .message-box { background: white; padding: 15px; border-left: 3px solid #F5A623; white-space: pre-wrap; }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        a { color: #F5A623; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Inquiry from Minetra Mining</h1>
          <p>Received on ${dateStr}</p>
        </div>
        
        <div class="content">
          <div class="field">
            <div class="label">Name</div>
            <div class="value">${escapeHtml(name)}</div>
          </div>
          
          <div class="field">
            <div class="label">Email</div>
            <div class="value">
              <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>
            </div>
          </div>
          
          ${phone ? `
          <div class="field">
            <div class="label">Phone</div>
            <div class="value">
              <a href="tel:${escapeHtml(phone)}">${escapeHtml(phone)}</a>
            </div>
          </div>
          ` : ''}
          
          <div class="field">
            <div class="label">Subject</div>
            <div class="value">${getSubjectLabel(subject)}</div>
          </div>
          
          <div class="field">
            <div class="label">Message</div>
            <div class="message-box">${escapeHtml(message)}</div>
          </div>
        </div>
        
        <div class="footer">
          <p>This email was sent from the contact form on Minetra Mining</p>
          <p>Reply directly to this email to respond to ${escapeHtml(name)}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

function escapeHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
