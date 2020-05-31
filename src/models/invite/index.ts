import Chance from 'chance'

import Room from '../room'
import User, { UserResolvable } from '../user'

import StoredInvite from '../../schemas/invite.schema'
import IInvite, { IInviteHeaders, IInviteOptions, TargetResolvable, TargetType } from './defs'

import { InviteNotFound, TargetTypeNotFound, UserAlreadyInRoom } from '../../utils/errors.utils'
import { generateFlake } from '../../utils/generate.utils'
import { extractTargetId, extractUserId } from '../../utils/helpers.utils'

export type InviteResolvable = Invite | string

const chance = new Chance()

export default class Invite {
  public id: string
  public createdAt: number
  public createdBy?: UserResolvable

  public active: boolean

  public target?: TargetResolvable
  public targetType: TargetType

  public code: string
  public uses: string[]
  public options: IInviteOptions

  constructor(json?: IInvite) {
    if(!json)
      return

    this.setup(json)
  }

  public load = (id: string) => new Promise<Invite>(async (resolve, reject) => {
    try {
      const doc = await StoredInvite.findOne({ 'info.id': id })

      if(!doc)
        throw InviteNotFound

      this.setup(doc)

      resolve(this)
    } catch(error) {
      reject(error)
    }
  })

  public findFromCode = (code: string) => new Promise<Invite>(async (resolve, reject) => {
    try {
      const doc = await StoredInvite.findOne({
        $and: [
          {
            'info.active': true
          },
          {
            'data.code': code
          }
        ]
      })

      if(!doc)
        throw InviteNotFound

      this.setup(doc)

      resolve(this)
    } catch(error) {
      reject(error)
    }
  })

  public use = (user: User, type?: TargetType) => new Promise<TargetResolvable>(async (resolve, reject) => {
    if(type && type !== this.targetType)
      return reject(TargetTypeNotFound)

    if(this.targetType === 'room' && user.room)
      return reject(UserAlreadyInRoom)

    try {
      const targetId = extractTargetId(this.target),
        query = { $set: {}, $push: { 'data.uses': user.id } }

      if((this.uses.length + 1) >= this.options.maxUses && !this.options.unlimitedUses)
        query.$set['info.active'] = false

      await StoredInvite.updateOne({ 'info.id': this.id }, query)

      switch (this.targetType) {
        case 'room':
          const room = await new Room().load(targetId)
          await user.joinRoom(room)

          resolve(room)
          break
        default:
          throw TargetTypeNotFound
      }
    } catch(error) {
      reject(error)
    }
  })

  public create = (
    target: TargetResolvable,
    targetType: TargetType,
    options?: IInviteOptions,
    headers?: IInviteHeaders,
    creator?: UserResolvable
  ) => new Promise<Invite>(async (resolve, reject) => {
    try {
      const json: IInvite = {
        info: {
          id: generateFlake(),
          createdAt: Date.now(),
          createdBy: extractUserId(creator),

          active: true,
          system: headers ? headers.system || false : false,

          targetId: extractTargetId(target),
          targetType
        },
        data: {
          code: !options.random && options.code ? options.code : chance.string({
            pool: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789',
            length: 5
          }),
          uses: [],

          options: options ? {
            maxUses: options.maxUses,
            unlimitedUses: options.unlimitedUses
          } : {
              maxUses: 0,
              unlimitedUses: true
            }
        }
      }

      const stored = new StoredInvite(json)
      await stored.save()

      this.setup(json)

      resolve(this)
    } catch(error) {
      reject(error)
    }
  })

  public fetchTarget = () => new Promise<Invite>(async (resolve, reject) => {
    try {
      const targetId = extractTargetId(this.target)

      switch (this.targetType) {
        case 'room':
          const room = await new Room().load(targetId)
          await room.fetchMembers()

          this.target = room
      }

      resolve(this)
    } catch(error) {
      reject(error)
    }
  })

  public destroy = () => new Promise(async (resolve, reject) => {
    try {
      await StoredInvite.deleteOne({
        'info.id': this.id
      })

      resolve()
    } catch(error) {
      reject(error)
    }
  })

  public setup = (json: IInvite) => {
    this.id = json.info.id
    this.createdAt = json.info.createdAt
    this.createdBy = json.info.createdBy

    this.active = json.info.active

    this.target = json.info.targetId
    this.targetType = json.info.targetType

    this.code = json.data.code
    this.uses = json.data.uses
    this.options = json.data.options
  }
}
