import { Response } from 'express'

interface IAPIResponse {
	response: string
	error: {
		title: string
		description: string
	}
	status: number
}

export const UserNoAuth: IAPIResponse = {
	response: 'USER_NO_AUTH',
	error: {
		title: 'User No Auth',
		description: 'You\'re not authenticated. Please log out and try again.'
	},
	status: 401
}

export const UserBanned: IAPIResponse = {
	response: 'USER_BANNED',
	error: {
		title: 'User Banned',
		description: 'You\'re banned from this instance.'
	},
	status: 401
}

export const UserNotAuthorized: IAPIResponse = {
	response: 'USER_NOT_AUTHORIZED',
	error: {
		title: 'User Not Authorized',
		description: 'You\'re not allowed to create rooms.'
	},
	status: 401
}

export const UserNotAllowed: IAPIResponse = {
	response: 'USER_NOT_ALLOWED',
	error: {
		title: 'User Not Allowed',
		description: 'You\'re lacking permissions to access this.'
	},
	status: 401
}

export const UserNotInRoom: IAPIResponse = {
	response: 'USER_NOT_IN_ROOM',
	error: {
		title: 'User Not in Room',
		description: 'You\'re currently not in a room. Join or create one and try again.'
	},
	status: 410
}

export const UserAlreadyInRoom: IAPIResponse = {
	response: 'USER_ALREADY_IN_ROOM',
	error: {
		title: 'User Already in Room',
		description: 'You\'re already in a room! Leave this one, and then try again.'
	},
	status: 409
}

export const InviteNotFound: IAPIResponse = {
	response: 'INVITE_NOT_FOUND',
	error: {
		title: 'Invite Not Found',
		description: 'This invite wasn\'t found. Make sure it hasn\'t expired, and that you typed it in correctly.'
	},
	status: 404
}

export const RoomNotFound: IAPIResponse = {
	response: 'ROOM_NOT_FOUND',
	error: {
		title: 'Room Not Found',
		description: 'This room was not found. Refresh the page and try again.'
	},
	status: 404
}

export const RoomNameTooLong: IAPIResponse = {
	response: 'ROOM_NAME_TOO_LONG',
	error: {
		title: 'Room Name Too Long',
		description: 'This room name is too short. Please specify a name up to 30 characters.'
	},
	status: 413
}

export const RoomNameTooShort: IAPIResponse = {
	response: 'ROOM_NAME_TOO_SHORT',
	error: {
		title: 'Room Name Too Long',
		description: 'This room name is too short. Please specify a name up to 30 characters.'
	},
	status: 413
}

export const UserNotFound: IAPIResponse = {
	response: 'USER_NOT_FOUND',
	error: {
		title: 'User Not Found',
		description: 'This user was not found.'
	},
	status: 404
}

export const ControllerIsNotAvailable: IAPIResponse = {
	response: 'CONTROLLER_IS_NOT_AVAILABLE',
	error: {
		title: 'Controller Is Not Available',
		description: 'The controller isn\'t currently available, ask the member who has the control for it.'
	},
	status: 406
}

export const UserDoesNotHaveRemote: IAPIResponse = {
	response: 'USER_DOES_NOT_HAVE_REMOTE',
	error: {
		title: 'User Does Not Have Remote',
		description: 'This user doesn\'t currently have the remote. Refresh the page and try again.'
	},
	status: 417
}

export const UserIsNotPermitted: IAPIResponse = {
	response: 'USER_IS_NOT_PERMITTED',
	error: {
		title: 'User Is Not Permitted',
		description: 'You\'re not permitted to perform this action. Refresh the page and try again.'
	},
	status: 401
}

export const MessageTooLong: IAPIResponse = {
	response: 'MESSAGE_TOO_LONG',
	error: {
		title: 'Message Too Long',
		description: 'The message you\'re trying to send is too long. Short it to under 255 characters before retrying.'
	},
	status: 413
}

export const MessageTooShort: IAPIResponse = {
	response: 'MESSAGE_TOO_SHORT',
	error: {
		title: 'Message Too Short',
		description: 'The message you\'re trying to send is too short. Write up to 255 characters for your message.'
	},
	status: 413
}

export const MessageNotFound: IAPIResponse = {
	response: 'MESSAGE_NOT_FOUND',
	error: {
		title: 'Message Not Found',
		description: 'A message with this ID was not found.'
	},
	status: 404
}

export const ReportNotFound: IAPIResponse = {
	response: 'REPORT_NOT_FOUND',
	error: {
		title: 'Report Not Found',
		description: 'A report with this ID was not found.'
	},
	status: 404
}

export const BanNotFound: IAPIResponse = {
	response: 'BAN_NOT_FOUND',
	error: {
		title: 'Ban Not Found',
		description: 'A ban with this ID was not found.'
	},
	status: 404
}

export const BanAlreadyExists: IAPIResponse = {
	response: 'BAN_ALREADY_EXISTS',
	error: {
		title: 'Ban Already Exists',
		description: 'A ban for this user already exists, remove it and then try again.'
	},
	status: 409
}

export const TooManyMembers: IAPIResponse = {
	response: 'TOO_MANY_MEMBERS',
	error: {
		title: 'Too Many Members',
		description: 'There are too many members in this room.'
	},
	status: 409
}

export const TargetTypeNotFound: IAPIResponse = {
	response: 'TARGET_TYPE_NOT_FOUND',
	error: {
		title: 'Target Type Not Found',
		description: 'We can\'t resolve this target type, please try again later.'
	},
	status: 0
}

export const NoPortalFound: IAPIResponse = {
	response: 'NO_PORTAL_FOUND',
	error: {
		title: 'No Portal Found',
		description: 'A portal with this ID was not found.'
	},
	status: 404
}

export const PortalNotOpen: IAPIResponse = {
	response: 'PORTAL_NOT_OPEN',
	error: {
		title: 'Portal Not Open',
		description: 'This portal is not currently open, please try again later.'
	},
	status: 409
}

export const PortalAlreadyAssigned: IAPIResponse = {
	response: 'PORTAL_ALREADY_ASSIGNED',
	error: {
		title: 'Portal Already Assigned',
		description: 'This room already has a portal assigned.'
	},
	status: 409
}

export const handleError = (error: any, res: Response) => {
	if (process.env.NODE_ENV === 'development')
		console.error(error)

	if (error)
		if (error.response && error.error && error.status)
			return res.status(error.status).send(error)
		else if (error.status)
			return res.sendStatus(error.status)
	res.sendStatus(500)
}
