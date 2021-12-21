import { readFile } from 'fs/promises';
import { createTransport } from 'nodemailer';

export interface Contact {
    readonly firstName: string;
    readonly lastName: string;
    readonly birthday: Date;
    readonly email: string;
}

type SendMail = (subject: string, content: string, to: string) => Promise<boolean>;

export async function loadFromFile(filePath: string): Promise<Contact[]> {
    const fileContent = await readFile(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    return lines.filter(l => l.trim().length > 0).slice(1).map(convert);
}

export function convert(line: string): Contact {
    const items = line.split(',');
    const dateItems = items[2].trim().split('/').map(x => parseInt(x, 10));
    return {
        lastName: items[0].trim(),
        firstName: items[1].trim(),
        birthday: new Date(dateItems[0], dateItems[1] - 1, dateItems[2]),
        email: items[3].trim(),
    };
}

export function getTodayBirthdayContacts(today: Date, contacts: Contact[]): Contact[] {
    return contacts.filter(c => {
        return c.birthday.getDay() == today.getDay() && c.birthday.getMonth() == today.getMonth()
    })
}

export async function sendBirthdayWish(sendMail: SendMail, contact: Contact): Promise<boolean> {
    const subject = 'Happy birthday!';
    const content = `Happy birthday, dear ${contact.firstName}!`;
    return await sendMail(subject, content, contact.email);
}

export function createSendMail(options: any): SendMail {
    const transporter = createTransport(options);
    return async (subject, content, to) => {
        await transporter.sendMail({
            from: '',
            to,
            subject,
            text: content,
        });
        return true;
    }
}
