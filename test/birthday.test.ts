jest.mock('nodemailer');

import { readFile } from 'fs/promises';
import { createTransport } from 'nodemailer';

interface Contact {
    readonly firstName: string;
    readonly lastName: string;
    readonly birthday: Date;
    readonly email: string;
}

type SendMail = (subject: string, content: string, to: string) => Promise<boolean>;

async function loadFromFile(filePath: string): Promise<Contact[]> {
    const fileContent = await readFile(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    return lines.filter(l => l.trim().length > 0).slice(1).map(convert);
}

function convert(line: string): Contact {
    const items = line.split(',');
    const dateItems = items[2].trim().split('/').map(x => parseInt(x, 10));
    return {
        lastName: items[0].trim(),
        firstName: items[1].trim(),
        birthday: new Date(dateItems[0], dateItems[1] - 1, dateItems[2]),
        email: items[3].trim(),
    };
}

function getTodayBirthdayContacts(today: Date, contacts: Contact[]): Contact[] {
    return contacts.filter(c => {
        return c.birthday.getDay() == today.getDay() && c.birthday.getMonth() == today.getMonth()
    })
}

async function sendBirthdayWish(sendMail: SendMail, contact: Contact): Promise<boolean> {
    const subject = 'Happy birthday!';
    const content = `Happy birthday, dear ${contact.firstName}!`;
    return await sendMail(subject, content, contact.email);
}

function createSendMail(options: any): SendMail {
    const transporter = createTransport(options);
    return (subject, content, to) => {
        return transporter.sendMail({
            from: '',
            to,
            subject,
            text: content,
        });
    }
}

async function main(username: string, password: string, csvpath: string): Promise<void> {
    const sendMail = createSendMail({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
            user: username,
            pass: password,
        },
    })

    const contacts = await loadFromFile(csvpath)
    const sendingContacts = getTodayBirthdayContacts(new Date(), contacts)
    await Promise.all(sendingContacts.map(async c => {
        await sendBirthdayWish(sendMail, c)
    }))
}

describe('convert', () => {
    it('should convert a csv line to a Contact object', () => {
        const contact = convert('Doe, John, 1982/10/08, john.doe@foobar.com');

        expect(contact).not.toBeNull();
        expect(contact).toBeDefined();
        expect(contact).toEqual({
            firstName: 'John',
            lastName: 'Doe',
            birthday: new Date(1982, 9, 8),
            email: 'john.doe@foobar.com',
        });
    });
});

describe('loadFromFile', () => {
    it('should load a csv file into memory array of contacts', async () => {
        const contacts = await loadFromFile('test/fixtures/birthday.csv');
        expect(contacts).toHaveLength(2);
    });
});

describe("getTodayBirthdayContacts", () => {
    it('should return todaty contacts', () => {
        const contacts: Contact[] = [
            {
                firstName: 'John1',
                lastName: 'Doe',
                birthday: new Date(1983, 9, 9),
                email: 'john.doe@foobar.com',
            },
            {
                firstName: 'John2',
                lastName: 'Doe',
                birthday: new Date(1984, 9, 10),
                email: 'john.doe@foobar.com',
            },
            {
                firstName: 'John3',
                lastName: 'Doe',
                birthday: new Date(1985, 8, 11),
                email: 'john.doe@foobar.com',
            },
            {
                firstName: 'John4',
                lastName: 'Doe',
                birthday: new Date(1985, 8, 11),
                email: 'john.doe@foobar.com',
            }
        ]

        const today = new Date(1985, 8, 11);

        const resContacts = getTodayBirthdayContacts(today, contacts)
        expect(resContacts).toHaveLength(2)
    })
})

describe('sendBirthdayWish', () => {
    it('should call node-sendmail correctly', async () => {
        const sendMail = jest.fn();

        await sendBirthdayWish(sendMail, {
            firstName: 'John4',
            lastName: 'Doe',
            birthday: new Date(1985, 8, 11),
            email: 'john.doe@foobar.com',
        });

        expect(sendMail.mock.calls).toHaveLength(1);
        expect(sendMail.mock.calls[0]).toMatchObject([
            'Happy birthday!',
            'Happy birthday, dear John4!',
            'john.doe@foobar.com',
        ]);
    });
});



const createTransportMock = createTransport as jest.Mock<typeof createTransport>;
const sendMailMock = jest.fn();
createTransportMock.mockReturnValue({
    sendMail: sendMailMock,
});

beforeEach(() => {
    jest.clearAllMocks()
})

afterEach(() => {
    createTransportMock.mockClear();
    sendMailMock.mockClear();
});

describe('createSendMail', () => {

    it('should create a SendMail function by smtp account info', () => {
        const sendMail = createSendMail({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: 'foo',
                pass: 'foopass',
            },
        });

        expect(createTransportMock.mock.calls).toHaveLength(1);
        expect(createTransportMock.mock.calls[0][0]).toMatchObject({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: 'foo',
                pass: 'foopass',
            },
        });
    });

    it('should create a SendMail function which calls nodemailer sendMail function', () => {
        const sendMail = createSendMail({});
        sendMail('subject', 'content', 'foo.bar@gmail.com');

        expect(sendMailMock.mock.calls).toHaveLength(1);
        expect(sendMailMock.mock.calls[0][0]).toMatchObject({
            subject: 'subject',
            text: 'content',
            to: 'foo.bar@gmail.com',
        });
    });
});

describe('main', () => {
    it('should send mail with username/password and csv', async () => {

        const username = 'foo'
        const password = 'bar'
        const csvpath = 'test/fixtures/birthday.csv'

        jest.useFakeTimers().setSystemTime(new Date(2021, 9, 8).getTime())

        await main(username, password, csvpath)

        expect(sendMailMock).toHaveBeenCalledWith({from: '', subject: 'Happy birthday!',
        text: 'Happy birthday, dear John!',
        to: 'john.doe@foobar.com'})
    })
})
