export default {
    /**
     * The amount of members a room needs to hit for a Portal (VM) to be created / queued (default 2)
     */
    min_member_portal_creation_count: parseInt(process.env.MIN_MEMBER_PORTAL_CREATION_COUNT || '2'),

    /**
     * The maximum amount of members a room can have (default 10)
     */
    max_room_member_count: parseInt(process.env.MAX_ROOM_MEMBER_COUNT || '10')
}