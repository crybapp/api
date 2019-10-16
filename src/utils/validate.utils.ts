import { WSEventType } from '../server/websocket/models/event'

const validateKeyControllerEvent = data => {
    /**
     * TODO: Add proper key code range validation
     */
    const isKeyCodeValid = true,
            isCtrlKeyValid = typeof data.ctrlKey === 'boolean',
            isShiftKeyValid = typeof data.shiftKey === 'boolean'

    return isKeyCodeValid && isCtrlKeyValid && isShiftKeyValid
}

const validateControllerPositionCoord = (pos: number) => typeof pos === 'number' && pos > 0
const validateControllerPosition = data => validateControllerPositionCoord(data.x) && validateControllerPositionCoord(data.y)
const validateControllerButton = (button: number) => button === 1 || button === 3

export const validateControllerEvent = (data, type: WSEventType) => {
    switch(type) {
        case 'KEY_DOWN':
            return validateKeyControllerEvent(data)
        case 'KEY_UP':
            return validateKeyControllerEvent(data)
        case 'PASTE_TEXT':
            // TODO: Validation
            return true
        case 'MOUSE_MOVE':
            return validateControllerPosition(data)
        case 'MOUSE_SCROLL':
            return typeof data.scrollUp === 'boolean'
        case 'MOUSE_DOWN':
            return validateControllerPosition(data) && validateControllerButton(data.button)
        case 'MOUSE_UP':
            return validateControllerPosition(data) && validateControllerButton(data.button)
        default:
            return false
    }
}
