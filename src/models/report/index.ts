import { MessageResolvable } from '../message'
import { RoomResolvable } from '../room'
import { UserResolvable } from '../user'

import StoredReport from '../../schemas/report.schema'
import IReport from './defs'

import { ReportNotFound } from '../../utils/errors.utils'
import { generateFlake } from '../../utils/generate.utils'
import { extractMessageId, extractRoomId, extractUserId } from '../../utils/helpers.utils'

export default class Report {
  public id: string
  public createdAt: number
  public createdBy: UserResolvable

  public message: MessageResolvable
  public room: RoomResolvable

  constructor(json?: IReport) {
    if(!json)
      return

    this.setup(json)
  }

  public async load() {
    const doc = await StoredReport.findOne({ 'info.id': this.id })

    if(!doc)
      throw ReportNotFound

    this.setup(doc)

    return this
  }

  public async create(
    message: MessageResolvable,
    room: RoomResolvable,
    reporter?: UserResolvable
  ) {
    const messageId = extractMessageId(message)
    const roomId = extractRoomId(room)

    const json: IReport = {
      info: {
        id: generateFlake(),
        createdAt: Date.now(),
        createdBy: extractUserId(reporter)
      },
      data: {
        messageId,
        roomId
      }
    }

    const stored = new StoredReport(json)
    await stored.save()

    this.setup(json)

    return this
  }

  public async destroy() {
    await StoredReport.deleteOne({
      'info.id': this.id
    })
  }

  public setup(json: IReport) {
    this.id = json.info.id
    this.createdAt = json.info.createdAt

    if(!this.createdBy)
      this.createdBy = json.info.createdBy

    if(!this.message)
      this.message = json.data.messageId

    if(!this.room)
      this.room = json.data.roomId
  }
}
