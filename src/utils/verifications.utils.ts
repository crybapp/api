export const verifyEnv = (...vars) => {
  vars.forEach(evar => {
    if (!process.env[evar.toUpperCase()])
      throw new Error(`No value was found for ${evar} - make sure .env is setup correctly!`)
  })
}
