import { Document } from 'mongoose'

export default interface IBan {
    info: {
        id: string
        createdAt: number
        createdBy: string

        active: boolean
    }
    data: {
        userId: string
        reason: string
    }
}

export interface IStoredBan extends IBan, Document {}