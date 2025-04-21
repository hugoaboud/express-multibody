import { Test } from './test_lib';

describe('multipart/form-data (files)', () => {
    Test.beforeAll();

    // For cleanup
    const toRemove = {
        client: [] as string[],
        server: [] as { delete: () => any }[]
    }

    it('Should parse single file', async () => {
        const file = Test.makeFile('tmp/single_test.tmp');
        toRemove.client.push(file.filepath);

        const formdata = Test.makeFormdata([
            ['file_prop', file]
        ]);

        const body = await Test.requestFormData(formdata);
        toRemove.server.push(body.file_prop)

        expect(body).toEqual({
            file_prop: await Test.expectedFile('file_prop', file)
        })

    }, 10000)

    it('Should parse multiple files', async () => {
        const file1 = Test.makeFile('tmp/multiple_test1.tmp');
        const file2 = Test.makeFile('tmp/multiple_test2.tmp');
        const file3 = Test.makeFile('tmp/multiple_test3.tmp');
        toRemove.client.push(file1.filepath, file2.filepath, file3.filepath);

        const formdata = Test.makeFormdata([
            ['file_prop1', file1],
            ['file_prop2', file2],
            ['file_prop3', file3]
        ]);

        const body = await Test.requestFormData(formdata);
        toRemove.server.push(body.file_prop1, body.file_prop2, body.file_prop3)

        expect(body).toEqual({
            file_prop1: await Test.expectedFile('file_prop1', file1),
            file_prop2: await Test.expectedFile('file_prop2', file2),
            file_prop3: await Test.expectedFile('file_prop3', file3)
        })

    }, 10000)
    
    it('Should parse nested files', async () => {
        const file1 = Test.makeFile('tmp/nested_test1.tmp');
        const file2 = Test.makeFile('tmp/nested_test2.tmp');
        const file3 = Test.makeFile('tmp/nested_test3.tmp');
        const file4 = Test.makeFile('tmp/nested_test4.tmp');
        toRemove.client.push(file1.filepath, file2.filepath, file3.filepath, file4.filepath);

        const formdata = Test.makeFormdata([
            ['prop1[file_prop1]', file1],
            ['prop1[file_prop2]', file2],
            ['prop2[file_prop1]', file3],
            ['prop2[file_prop2]', file4],
        ]);

        const body = await Test.requestFormData(formdata);
        toRemove.server.push(body.prop1.file_prop1, body.prop1.file_prop2, body.prop2.file_prop1, body.prop2.file_prop2)

        expect(body).toEqual({
            prop1: {
                file_prop1: await Test.expectedFile('prop1[file_prop1]', file1),
                file_prop2: await Test.expectedFile('prop1[file_prop2]', file2),
            },
            prop2: {
                file_prop1: await Test.expectedFile('prop2[file_prop1]', file3),
                file_prop2: await Test.expectedFile('prop2[file_prop2]', file4),
            }
        })

    }, 10000)

    it('Should parse array of files', async () => {
        const file1 = Test.makeFile('tmp/array_test1.tmp');
        const file2 = Test.makeFile('tmp/array_test2.tmp');
        const file3 = Test.makeFile('tmp/array_test3.tmp');
        toRemove.client.push(file1.filepath, file2.filepath, file3.filepath);

        const formdata = Test.makeFormdata([
            ['files_prop[]', file1],
            ['files_prop[]', file2],
            ['files_prop[]', file3]
        ]);

        const body = await Test.requestFormData(formdata);
        toRemove.server.push(...body.files_prop)

        expect(body).toEqual({
            files_prop: [
                await Test.expectedFile('files_prop[]', file1),
                await Test.expectedFile('files_prop[]', file2),
                await Test.expectedFile('files_prop[]', file3)
            ]
        })

    }, 10000)

    it('Should parse array of objects containing files', async () => {
        const file1 = Test.makeFile('tmp/objarray_test1.tmp');
        const file2 = Test.makeFile('tmp/objarray_test2.tmp');
        const file3 = Test.makeFile('tmp/objarray_test3.tmp');
        const file4 = Test.makeFile('tmp/objarray_test4.tmp');
        toRemove.client.push(file1.filepath, file2.filepath, file3.filepath, file4.filepath);

        const formdata = Test.makeFormdata([
            ['prop1[][file_prop1]', file1],
            ['prop1[][file_prop2]', file2],
            ['prop1[][file_prop1]', file3],
            ['prop1[][file_prop2]', file4],
        ]);

        const body = await Test.requestFormData(formdata);
        toRemove.server.push(...body.prop1.map((p: any) => [p.file_prop1, p.file_prop2]).flat(1))

        expect(body).toEqual({
            prop1: [
                {
                    file_prop1: await Test.expectedFile('prop1[][file_prop1]', file1),
                    file_prop2: await Test.expectedFile('prop1[][file_prop2]', file2),
                },
                {
                    file_prop1: await Test.expectedFile('prop1[][file_prop1]', file3),
                    file_prop2: await Test.expectedFile('prop1[][file_prop2]', file4),
                }
            ]
        })

    }, 10000)


    // This test ensures the ordering of files remains the same
    // after upload.
    // This is influenced by `FormData.consume`.

    it('Should parse big (512 = 32mb) array of files', async () => {
        const files = Array.from({length: 512}).map((_,i) =>
            Test.makeFile(`tmp/bigarray_test${i}.tmp`, 64*1024)
        )
        toRemove.client.push(...files.map(f => f.filepath));

        const formdata = Test.makeFormdata(files.map(f =>
            ['files_prop[]', f]
        ))

        const body = await Test.requestFormData(formdata);
        toRemove.server.push(...body.files_prop)

        const files_prop: any[] = [];
        for (const file of files) {
            files_prop.push(
                await Test.expectedFile('files_prop[]', file)
            )
        }

        expect(body).toEqual({ files_prop })

    }, 30000)

    afterAll(() => {
        Test.rmFiles(toRemove.client, toRemove.server);
    })
    Test.afterAll();
})
