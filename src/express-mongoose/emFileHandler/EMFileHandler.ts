import mongoose = require('mongoose');
import gridfs = require('gridfs-stream');
import { GridFSBucket, GridFSBucketReadStream } from 'mongodb';
import fs = require('fs');

import { EMSession } from '../emSession/emSession';


class EMFileHandler 
{
    //#region Properties

    private session : EMSession;
    private gfsBucket : GridFSBucket

    //#endregion

    //#region Methods

    constructor(session : EMSession, bucketName : string) 
    {
        this.session = session;
        this.gfsBucket = new mongoose.mongo.GridFSBucket(session.serviceSession.mongooseConnection.db, { bucketName })
    }

    save(filename, mimetype, filePath) : Promise<void>
    {
        return new Promise((resolve,reject) => {
            let writestream = this.gfsBucket.openUploadStream(filename, { contentType: mimetype });
            let readStream = fs.createReadStream(filePath)
            
            readStream.on('error', e => reject(e));

            readStream.pipe(writestream);
            writestream.on('finish', () => {
                resolve();
            });
            writestream.on('error', err => {
                reject(err);                
            });            
        });
    }

    retrieve(filename) : Promise<GridFSBucketReadStream>
    {
        let readstream = this.gfsBucket.openDownloadStreamByName(filename);
        return Promise.resolve(readstream);
    }


    //#endregion

    //#region Accessors

    //#endregion
}

export { EMFileHandler }