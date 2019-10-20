export const verify_env = (...vars) => {
    vars.forEach(evar => {
        if (!process.env[evar.toUpperCase()])
            throw `No value was found for ${evar} - make sure .env is setup correctly!`
    })
}
