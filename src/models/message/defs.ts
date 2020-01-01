import { Document } from 'mongoose'

export default interface IMessage {
	info: {
		id: string
		createdAt: number

		author: string
		room: string
	}
	data: {
		content: string
	}
}

export interface IStoredMessage extends IMessage, Document {}
