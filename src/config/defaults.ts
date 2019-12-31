export default {
    /**
     * The amount of members a room needs to hit for a Portal (VM) to be created / queued (default 2)
     */
    min_member_portal_creation_count: parseInt(process.env.MIN_MEMBER_PORTAL_CREATION_COUNT || '2'),

    /**
     * The maximum amount of members a room can have (default 10)
     */
    max_room_member_count: parseInt(process.env.MAX_ROOM_MEMBER_COUNT || '10'),

    /**
     * Whenever destroy portals when room gets empty
     */
    destroy_portal_when_empty: typeof process.env.DESTROY_PORTAL_WHEN_EMPTY !== 'undefined' ?
                                (process.env.DESTROY_PORTAL_WHEN_EMPTY === 'true') : true,

    /**
     * The timeout before an empty room gets their portal destroyed in seconds (default 5)
     */
    empty_room_portal_destroy: parseInt(process.env.EMPTY_ROOM_PORTAL_DESTROY || '5'),

    /**
     * The user IDs that are allowed to create rooms, comma (,) separated
     */
    room_whitelist: (process.env.ROOM_WHITELIST === 'true'),

    /**
     * The user IDs that are allowed to create rooms, comma (,) separated
     */
    allowed_user_ids: (process.env.ALLOWED_USER_IDS || '').split(',')
}
