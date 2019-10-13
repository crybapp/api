import { UserResolvable } from '..'

import IBan from './defs'
import StoredBan from '../../../schemas/ban.schema'

import { extractUserId } from '../../../utils/helpers.utils'
import { generateFlake } from '../../../utils/generate.utils'
import { BanAlreadyExists, BanNotFound } from '../../../utils/errors.utils'

export default class Ban {
    id: string
    createdAt: number
    createdBy: UserResolvable
    active: boolean

    user: UserResolvable
    reason: string
    
    constructor(json?: IBan) {
        if(!json) return

        this.setup(json)
    }

    load = (id: string) => new Promise<Ban>(async (resolve, reject) => {
        try {
            const doc = await StoredBan.findOne({ 'info.id': id })
            if(!doc) throw BanNotFound

            this.setup(doc)

            resolve(this)
        } catch(error) {
            reject(error)
        }
    })

    create = (user: UserResolvable, reason?: string, from?: UserResolvable) => new Promise<Ban>(async (resolve, reject) => {
        try {
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
            if(existing.length > 0) throw BanAlreadyExists

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

            resolve(this)
        } catch(error) {
            reject(error)
        }
    })

    setActive = (active: boolean) => new Promise<Ban>(async (resolve, reject) => {
        try {
            await StoredBan.updateOne({
                'info.id': this.id
            }, {
                $set: {
                    'info.active': active
                }
            })

            this.active = active

            resolve(this)
        } catch(error) {
            reject(error)
        }
    })

    setup = (json: IBan) => {
        this.id = json.info.id
        this.createdAt = json.info.createdAt
        this.active = json.info.active

        this.reason = json.data.reason

        if(!this.createdBy) this.createdBy = json.info.createdBy
        if(!this.user) this.user = json.data.userId
    }
}