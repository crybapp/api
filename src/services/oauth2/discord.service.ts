import axios from 'axios'
import md5 from 'md5'
import qs from 'qs'

import { Profile } from 'passport-discord'

interface IDiscordAuthentication {
	access_token: string
	refresh_token: string
	scope: string
}

export const DISCORD_OAUTH_BASE_URL = 'https://discordapp.com/api/oauth2/authorize'
export const DISCORD_OAUTH_SCOPES = ['identify', 'email']

interface AvatarConstruction {
	userId: string
	email: string

	hash?: string
}

export const constructAvatar = (data: AvatarConstruction) => {
	if (!data.hash)
		return `https://www.gravatar.com/avatar/${md5(data.email || '')}?d=retro&s=128`

	const { userId, hash } = data
	let url = `https://cdn.discordapp.com/avatars/${userId}/`

	if (data.hash.substr(0, 2) === 'a_')
		url += `${hash}.gif`
	else
		url += `${hash}.png`

	return url
}

export const fetchUserProfile = (access_token: string) => new Promise<Profile>(async (resolve, reject) => {
	try {
		const { data } = await axios({
			method: 'GET',
			url: 'https://discordapp.com/api/v6/users/@me',
			headers: {
				authorization: `Bearer ${access_token}`
			}
		})

		resolve(data)
	} catch (error) {
		reject(error)
	}
})

const sendOauthRequest = (opts: object) => axios({
	method: 'POST',
	url: 'https://discordapp.com/api/oauth2/token',
	headers: {
		'Content-Type': 'application/x-www-form-urlencoded; charset=utf-8'
	},
	data: qs.stringify({
		...opts,
		redirect_uri: process.env.DISCORD_CALLBACK_URL,
		client_id: process.env.DISCORD_CLIENT_ID,
		client_secret: process.env.DISCORD_CLIENT_SECRET,
		scope: DISCORD_OAUTH_SCOPES.join(' ')
	})
})

export const exchangeRefreshToken = (refresh_token: string) => new Promise<IDiscordAuthentication>(async (resolve, reject) => {
	try {
		const { data } = await sendOauthRequest({
			refresh_token,
			grant_type: 'refresh_token'
		})

		resolve(data)
	} catch (error) {
		reject(error.response ? error.response.data : error)
	}
})

export default async (code: string) => new Promise<IDiscordAuthentication>(async (resolve, reject) => {
	try {
		const { data } = await sendOauthRequest({
			code,
			grant_type: 'authorization_code'
		})

		resolve(data)
	} catch (error) {
		reject(error.response ? error.response.data : error)
	}
})
