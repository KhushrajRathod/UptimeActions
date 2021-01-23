const { getRelease } = require("get-release")
const { config, endpoints } = require("./monitors.config.js")
const { writeFile } = require('fs').promises
const got = require('got')
const core = require('@actions/core')

async function main() {
    const [user, repo] = process.env.GITHUB_REPOSITORY.split('/')
    console.log(`Running in ${user}/${repo}`)
    let oldState

    try {
        let url = await getRelease(
            {
                provider: "github",
                user,
                repo,
                part: "state"
            }
        )

        const response = await got(url[0])
        oldState = response.body
    } catch (e) {
        oldState = false
    }

    let newState = {}
    let changes = {}

    for (const { name, url } of endpoints) {
        try {
            await got(url, { timeout: config.timeout || 3000 })
            console.log("OK: ", name, url)
            newState[url] = true

            if (
                !oldState ||
                !(url in oldState) ||
                !(url in newState) ||
                oldState[url] !== newState[url]
            ) {
                changes[name] = true
            }
        } catch (e) {
            console.error("ERR: ", name, url)
            newState[url] = false

            if (
                !oldState ||
                !(url in oldState) ||
                !(url in newState) ||
                oldState[url] !== newState[url]
            ) {
                changes[name] = false
            }
        }
    }

    if (hasProperties(changes)) {
        console.log("Changes exist, alerting:")
        console.log(changes)

        await writeFile('state.json', JSON.stringify(newState))
        core.setOutput('state_changed', "true")

        for (const endpoint of config.alertEndpoints) {
            try {
                await got.post(endpoint, {
                    json: changes,
                    headers: {
                        "token": process.env.UPTIME_SLACK_TOKEN
                    }
                })
                console.log("ALERTED: ", endpoint)
            } catch (e) {
                console.log("UNREACHABLE: ", endpoint)
            }
        }
    }
}

main()

function hasProperties(object) {
    for (const _ in object) {
        return true
    }
    return false
}