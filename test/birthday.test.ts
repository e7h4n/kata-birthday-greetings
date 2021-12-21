jest.mock('nodemailer');
import { createTransport } from 'nodemailer';
import { Contact, getTodayBirthdayContacts, loadFromFile, convert, createSendMail, sendBirthdayWish } from '../src/birthday';
import { main } from '../index'

// mock nodemail.sendMail
const CREATE_TRANSPORT_MOCK = createTransport as jest.MockedFunction<typeof createTransport>;
const SEND_MAIL_MOCK = jest.fn();
CREATE_TRANSPORT_MOCK.mockReturnValue({
    sendMail: SEND_MAIL_MOCK,
} as any);

beforeEach(() => {
    jest.clearAllMocks()
})

afterEach(() => {
    jest.clearAllMocks()
});

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

describe('getTodayBirthdayContacts', () => {
    it('should only return todaty contacts', () => {
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

    describe('should check date correctly', () => {
        [
            [new Date(1988, 11, 21), new Date(2021, 11, 21)],
        ].forEach(([birthday, today]) => {
            test(`birthday: ${birthday}, today ${today}`, () => {
                const contact: Contact = {
                    firstName: '',
                    lastName: '',
                    birthday,
                    email: '',
                };

                const resContacts = getTodayBirthdayContacts(today, [contact]);
                expect(resContacts).toHaveLength(1);
            });
        });
    });
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

        expect(CREATE_TRANSPORT_MOCK.mock.calls).toHaveLength(1);
        expect(CREATE_TRANSPORT_MOCK.mock.calls[0][0]).toMatchObject({
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
        const sendMail = createSendMail({
            auth: {
                user: 'foo',
            },
        });
        sendMail('subject', 'content', 'foo.bar@gmail.com');

        expect(SEND_MAIL_MOCK.mock.calls).toHaveLength(1);
        expect(SEND_MAIL_MOCK.mock.calls[0][0]).toMatchObject({
            subject: 'subject',
            text: 'content',
            to: 'foo.bar@gmail.com',
        });
    });
});

describe('main', () => {
    afterEach(() => {
        jest.useRealTimers();
    });

    it('should send mail with username/password and csv', async () => {
        jest.useFakeTimers().setSystemTime(new Date(2021, 9, 8).getTime());

        const username = 'foo';
        const password = 'bar';
        const csvpath = 'test/fixtures/birthday.csv';


        await main(username, password, csvpath);

        expect(SEND_MAIL_MOCK).toHaveBeenCalledWith({
            from: 'foo',
            subject: 'Happy birthday!',
            text: 'Happy birthday, dear John!',
            to: 'john.doe@foobar.com',
        });
    });
});
