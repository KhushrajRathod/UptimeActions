const core = require('@actions/core')
const now = new Date()
core.exportVariable("NOW", now.toString())
core.exportVariable("NOW_TAG", now.getTime())