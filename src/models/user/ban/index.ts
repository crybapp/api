import { UserResolvable } from '..'

import StoredBan from '../../../schemas/ban.schema'
import IBan from './defs'

import { BanAlreadyExists, BanNotFound } from '../../../utils/errors.utils'
import { generateFlake } from '../../../utils/generate.utils'
import { extractUserId } from '../../../utils/helpers.utils'

export default class Ban {
  public id: string
  public createdAt: number
  public createdBy: UserResolvable
  public active: boolean

  public user: UserResolvable
  public reason: string

  constructor(json?: IBan) {
    if (!json)
      return

    this.setup(json)
  }

  public async load(id: string) {
    const doc = await StoredBan.findOne({ 'info.id': id })
    if (!doc)
      throw BanNotFound

    this.setup(doc)

    return this
  }

  public async create(user: UserResolvable, reason?: string, from?: UserResolvable) {
    const existing = await StoredBan.find({
      $and: [
        {
          'info.active': true
        },
        {
          'data.userId': extractUserId(user)
        }
      ]
    })

    if (existing.length > 0)
      throw BanAlreadyExists

    const json: IBan = {
      info: {
        id: generateFlake(),
        createdAt: Date.now(),
        createdBy: extractUserId(from),
        active: true
      },
      data: {
        userId: extractUserId(user),
        reason
      }
    }

    const stored = new StoredBan(json)
    await stored.save()

    this.setup(json)

    return this
  }

  public async setActive(active: boolean) {
    await StoredBan.updateOne({
      'info.id': this.id
    }, {
      $set: {
        'info.active': active
      }
    })

    this.active = active

    return this
  }

  public setup(json: IBan) {
    this.id = json.info.id
    this.createdAt = json.info.createdAt
    this.active = json.info.active

    this.reason = json.data.reason

    if (!this.createdBy)
      this.createdBy = json.info.createdBy

    if (!this.user)
      this.user = json.data.userId
  }
}
