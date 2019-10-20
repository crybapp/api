import { Document } from 'mongoose'

export default interface IReport {
    info: {
        id: string,
        createdAt: number,
        createdBy: string
    },
    data: {
        messageId: string,
        roomId: string
    }
}

export interface IStoredReport extends IReport, Document {}
