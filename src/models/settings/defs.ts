export default interface ISettings {
    signupsDisabled: boolean
    signupsDisabledReason: string

    maintenance: boolean
    maintenanceReason: string

    roomLimit: number
    roomLimitReason: string
}
