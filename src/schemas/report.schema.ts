import { model, Schema } from 'mongoose'

import { IStoredReport } from '../models/report/defs'

const ReportSchema = new Schema({
	info: {
		id: String,
		createdAt: Number,
		createdBy: String
	},
	data: {
		messageId: String,
		roomId: String
	}
}, {
	typeKey: '$type'
})

const StoredReport = model<IStoredReport>('Report', ReportSchema)
export default StoredReport
