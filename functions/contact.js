// Cloudflare Pages Function for contact form submission
export async function onRequest(context) {
  // 只处理 POST 请求
  if (context.request.method !== 'POST') {
    return new Response('Method Not Allowed', { status: 405 });
  }

  try {
    const data = await context.request.json();
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
    const apiKey = context.env.RESEND_API_KEY || 're_EURQsKzD_Az8qwvjpYgGkXWSMoWTHayPB';
    const contactEmail = context.env.CONTACT_EMAIL || 'anjieda@gmail.com';

    // 发送邮件
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Thank you for your message! We will get back to you within 24 hours.',
        emailId: emailResult.id 
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Server error:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'Server error: ' + error.message 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

function getSubjectLabel(subject) {
  const labels = {
    'general': 'General Inquiry',
    'quote': 'Request Quote',
    'partnership': 'Partnership',
    'careers': 'Careers',
  };
  return labels[subject] || subject;
}

function generateEmailHTML(data) {
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

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}