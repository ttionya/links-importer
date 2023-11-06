import fs from 'node:fs'
import readline from 'node:readline'

import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc.js'
import timezone from 'dayjs/plugin/timezone.js'
import axios from 'axios'
import axiosRetry from 'axios-retry'
import chalk from 'chalk'

import 'dotenv/config'

dayjs.extend(utc)
dayjs.extend(timezone)

const request = axios.create({ baseURL: process.env.LINKDING_URL })

axiosRetry(request, { retries: 10, retryCondition: () => true, retryDelay: () => 3000 })

start()

async function start() {
  const rl = readline.createInterface({
    input: fs.createReadStream(process.env.LOG_PATH),
    terminal: false,
  })

  let tags = []

  for await (const line of rl) {
    if (!line) continue

    // 计算时间
    if (!line.startsWith('[')) {
      const dayjsInstance = dayjs(line).tz(process.env.TZ)
      const date = dayjsInstance.format('YYYYMMDD')
      const time = (
        dayjsInstance.format('mm').startsWith('0') ? dayjsInstance : dayjsInstance.add(10, 'minute')
      ).format('HH00')

      tags = [date, `${date}-${time}`]

      console.log('\n', line, '->', chalk.yellow(tags))

      continue
    }

    if (+tags[0] < +process.env.FROM_DATE) continue

    const list = JSON.parse(line)

    for (let i = 0; i < list.length; i++) {
      const item = list[i]

      console.log('\n', JSON.stringify(item))

      const { data: searchData } = await request.request({
        url: '/api/bookmarks/',
        method: 'GET',
        headers: {
          authorization: `Token ${process.env.LINKDING_TOKEN}`,
        },
        params: {
          q: item.title,
          limit: 10000,
        },
      })

      if (searchData.count > 0 && searchData.results.find((find) => find.url === item.url)) {
        console.warn(chalk.yellow(`${tags[0]} 已上传过 [${item.title}](${item.url})`))
      } else {
        const { data: resData } = await request.request({
          url: '/api/bookmarks/',
          method: 'POST',
          headers: {
            authorization: `Token ${process.env.LINKDING_TOKEN}`,
          },
          data: {
            url: item.url,
            title: item.title,
            description: '',
            notes: '',
            is_archived: false,
            unread: false,
            shared: true,
            tag_names: tags,
          },
        })

        console.log(resData)

        await sleep(1000)
      }

      await sleep(1000)
    }
  }
}

/**
 * @param {number} delay
 * @returns {Promise<void>}
 */
async function sleep(delay) {
  await new Promise((resolve) => {
    setTimeout(resolve, delay)
  })
}
