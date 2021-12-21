import { readFile } from 'fs/promises';

interface Contact {
    readonly firstName: string;
    readonly lastName: string;
    readonly birthday: Date;
    readonly email: string;
}

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
