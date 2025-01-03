export async function onRequestPost(ctx) {
    try {
        return await handleRequest(ctx);
    } catch(e) {
        return new Response(`${e.message}\n${e.stack}`, { status: 500 });
    }
}
 
async function handleRequest({ request, env }) {
    const data = await request.formData();
 
    const name = data.get('name');
    const email = data.get('email');
    const subject = data.get('subject');
    const message = data.get('message');
    const captcha = data.get('h-captcha-response');
 
    if (!name || !email || !subject || !message || !captcha) {
        return new Response('フィールドが埋まっていることを確認してください。', { status: 400 });
    }
 
    const captchaVerified = await verifyHcaptcha(
        captcha,
        request.headers.get('cf-connecting-ip'),
        env.HCAPTCHA_SECRET,
        env.HCAPTCHA_SITE_KEY
    );
 
    if (!captchaVerified) {
        return new Response('キャプチャが無効です。', { status: 400 });
    }
 
    await sendDiscordMessage(name, email, subject, message, env.DISCORD_WEBHOOK_URL);
 
    return new Response('OK');
}
 
async function verifyHcaptcha(response, ip, secret, siteKey) {
    const res = await fetch('https://hcaptcha.com/siteverify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `response=${response}&remoteip=${ip}&secret=${secret}&sitekey=${siteKey}`
    });
 
    const json = await res.json();
    return json.success;
}
 
async function sendDiscordMessage(name, email, subject, message, webhookUrl) {
    await fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            username: 'お問い合わせフォーム',
            embeds: [{
                color: 0x0099ff,
                title: 'Nova Mensagem',
                fields: [
                    {
                        name: 'Nome',
                        value: name,
                        inline: true,
                    },
                    {
                        name: 'Email',
                        value: email,
                        inline: true,
                    },
                    {
                        name: 'Assunto',
                        value: subject,
                    },
                    {
                        name: 'Mensagem',
                        value: "```" + message + "```",
                    }
                ]
            }]
        }),
    });
}
