import {createSendMail, loadFromFile, getTodayBirthdayContacts, sendBirthdayWish} from './src/birthday';

export async function main(username: string, password: string, csvpath: string): Promise<void> {
    const sendMail = createSendMail({
        host: 'smtp.qq.com',
        port: 465,
        secure: true,
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

if (typeof require !== 'undefined' && require.main === module) {
    main(process.argv[2], process.argv[3], process.argv[4]);
}
