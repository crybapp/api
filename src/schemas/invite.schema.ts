import { model, Schema } from 'mongoose'

import { IStoredInvite } from '../models/invite/defs'

const InviteSchema = new Schema({
  info: {
    id: String,
    createdAt: Number,
    createdBy: String,

    active: Boolean,
    system: Boolean,

    targetId: String,
    targetType: String
  },
  data: {
    code: String,
    uses: [String],

    options: {
      maxUses: Number,
      unlimitedUses: Boolean
    }
  }
}, {
  typeKey: '$type'
})

const StoredInvite = model<IStoredInvite>('Invite', InviteSchema)
export default StoredInvite
