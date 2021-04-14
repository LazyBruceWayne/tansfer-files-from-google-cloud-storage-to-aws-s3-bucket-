exports.helloWorld = async (req, res) => {
    let message = req.query.message || req.body.message || 'Hello World!';
    const datasetId = "";
    const bucketName = BUCKET_NAME;
    var loop = new Date();
    var date = ('0' + loop.getDate()).slice(-2);
    var month = ('0' + loop.getMonth() + 1).slice(-2);
    var year = loop.getFullYear();

    const tableId = "events_" + year + month + date;
    const filename = "events-" + year + month + date + ".json";

    // Location must match that of the source table.
    const options = {
        location: 'US',
        gzip: true,
    };


    const [job] = await bigquery
        .dataset(datasetId)
        .table(tableId)
        .extract(storageTwo.bucket(bucketName).file(filename), options);

    console.log(`Job ${job.id} created.`);
    const [files] = await storageTwo.bucket(BUCKET_NAME).getFiles();
    files.forEach(file => {
        if (file.name === filename) {

            var file = storageTwo.bucket(BUCKET_NAME).file(file.name);
            file.getSignedUrl({
                version: 'v4',
                action: 'read',
                expires: Date.now() + 60 * 60 * 1000, // 15 minutes
            }, function(err, url) {
                if (err) {
                    console.error(err);
                }
                axios.get(url, {
                        responseType: 'arraybuffer'
                    })
                    .then(response => {
                        const buffer = Buffer.from(response.data, 'base64');
                        return (async () => {
                            let type = (await fileType.fromBuffer(buffer)).mime
                            var params = {
                                Key: file.name,
                                Body: buffer,
                                Bucket: '',
                                ContentType: type,
                                ACL: 'private' //becomes a public URL
                            }

                            AWS.config.update({
                                accessKeyId: '',
                                secretAccessKey: ''
                            })

                            var s3 = new AWS.S3()
                            s3.upload(params).promise().then((response) => {
                                console.log('response', response);
                            }, (err) => {
                                console.log('err 2', err);
                            })

                        })();
                    })
                    .catch(err => {
                        console.log('err 3', err);
                    });

            });
        }

    });
    res.status(200).send(message);
};
