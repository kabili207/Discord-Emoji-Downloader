/* global $, error, saveAs, ace, JSZip */
const downloadBtn = $(
  '<button class="ui labeled icon red button" id="download" type="button">' +
  '<i class="cloud icon"></i>Download</button>'
)

const Emoji = (emojiID, animated = false) =>
  `https://cdn.discordapp.com/emojis/${emojiID}.${animated ? 'gif' : 'png'}?v=1`
// media.discordapp.net was used instead of cdn.discordapp.com to bypass CORS problems
const Sticker = (stickerID, isGif = false) =>
  `https://media.discordapp.net/stickers/${stickerID}.${isGif ? 'gif' : 'png'}?size=1024`
const API = {
  host: 'https://discord.com/api/v10',
  emojis: (guild) => `/guilds/${guild}/emojis`,
  guilds: '/users/@me/guilds',
  guild: (id) => `/guilds/${id}`,
  request: async (method, endpoint, token) => {
    return await fetch(API.host + endpoint, {
      method,
      headers: {
        Authorization: token
      }
    })
  }
}

const sortAlpha = (a, b) => {
  a = a.name.toLowerCase()
  b = b.name.toLowerCase()
  return a < b ? -1 : a > b ? 1 : 0
}

const editor = ace.edit('editor')
editor.setTheme('ace/theme/monokai')
editor.getSession().setMode('ace/mode/json')
editor.session.setUseWrapMode(true)
editor.setValue(`{
  "mfa_level": 0,
  "emojis": [
    {
      "require_colons": true,
      "animated": false,
      "managed": false,
      "name": "really1",
      "roles": [],
      "id": "326074073702727682"
    },
    {
      "require_colons": true,
      "animated": false,
      "managed": false,
      "name": "really4",
      "roles": [],
      "id": "326074073832620033"
    }
  ],
  "application_id": null,
  "name": "big emotes",
  "roles": [
    {
      "hoist": false,
      "name": "@everyone",
      "mentionable": false,
      "color": 0,
      "position": 0,
      "id": "326073960041152512",
      "managed": false,
      "permissions": 104324161
    }
  ],
  "afk_timeout": 300,
  "system_channel_id": null,
  "widget_channel_id": null,
  "region": "eu-west",
  "default_message_notifications": 0,
  "embed_channel_id": null,
  "explicit_content_filter": 0,
  "splash": null,
  "features": [],
  "afk_channel_id": null,
  "widget_enabled": false,
  "verification_level": 0,
  "owner_id": "152164749868662784",
  "embed_enabled": false,
  "id": "326073960041152512",
  "icon": null
}`)
editor.clearSelection()

// A helper function to attach the download-click handler
function attachDownloadHandler (zip, cleanGuildName) {
  // Remove any previous click handlers to prevent duplicates.
  downloadBtn.off('click')
  downloadBtn.click(() => {
    zip.generateAsync({ type: 'blob' })
      .then((content) => {
        saveAs(content, `Emojis_${cleanGuildName}.zip`)
      })
      .catch(err => {
        return error('Download failed.', err)
      })
  })
}

$(document).ready(function () {
  $('.menu .item').tab()
  $('#emojis').hide()
  $('#emojis2').hide()
  $('#stickers').hide()

  $('#tokenHelp').click(() => {
    $('.ui.basic.modal').modal('show')
  })
  $('button#continue').click(() => {
    $('#error').hide()
  })

  globalThis.guild = []
  globalThis.emojis = []
  globalThis.stickers = []

  $('#default-1 #continue').click(async (e) => {
    e.preventDefault()
    let token = $('#token').val()
    if (!token) return error('Invalid token.')
    $('#continue').addClass('loading')
    token = token.replace(/^"(.+)"$/, '$1')
    const res = await API.request('GET', API.guilds, token)
    if (!res.ok) {
      return error(
        res.status === 401
          ? 'Invalid token.'
          : 'Could not authenticate with Discord.'
      )
    }

    const guildsDropdown = (await res.json()).sort(sortAlpha).map((guild) => {
      return {
        name: guild.icon
          ? `<img src="https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png" />${guild.name}`
          : guild.name,
        value: guild.id
      }
    })

    $('#server-select').dropdown({
      values: guildsDropdown,
      placeholder: 'Select Server',
      onChange: async (value, text, $selected) => {
        $('#default-2').append(
          '<div class="ui active dimmer"><div class="ui loader"></div></div>'
        )
        $('#error').hide()
        $('#messages div.message').hide()
        $('#download').remove()
        const res = await API.request('GET', API.guild(value), token)
        if (!res.ok) return error('Could not fetch server emojis.')
        globalThis.guild = await res.json()
        globalThis.emojis = renameEmoji(globalThis.guild.emojis).sort(sortAlpha)
        globalThis.stickers = globalThis.guild.stickers.sort(sortAlpha)

        const emojis = globalThis.emojis.reduce(
          (acc, val, i) => {
            if (i > 149) {
              acc[1].push(val)
            } else {
              acc[0].push(val)
            }
            return acc
          },
          [[], []]
        )
        const emojisDropdown = []
        for (const emoji of emojis[0]) {
          emojisDropdown.push({
            name: `<img src="${Emoji(emoji.id, emoji.animated)}" style="width: 1.5em!important; height: 1.5em!important;" /> ${emoji.name}`,
            value: emoji.id,
            selected: true
          })
        }

        $('#emoji-select').dropdown({
          values: emojisDropdown,
          placeholder: 'Select Emojis',
          onChange: (value, text, $selected) => {
            $('#emojicount').text(
              `(${$("input[name='emojis']").val().split(',').length}/${emojis[0].length})`
            )
          }
        })
        const emojisDropdown2 = []
        for (const emoji of emojis[1]) {
          emojisDropdown2.push({
            name: `<img src="${Emoji(emoji.id, emoji.animated)}" style="width: 1.5em!important; height: 1.5em!important;" /> ${emoji.name}`,
            value: emoji.id,
            selected: true
          })
        }

        $('#emoji-select2').dropdown({
          values: emojisDropdown2,
          placeholder: 'Select Emojis',
          onChange: (value, text, $selected) => {
            $('#emojicount2').text(
              `(${$("input[name='emojis2']").val().split(',').length}/${emojis[1].length})`
            )
          }
        })
        const stickersDropdown = []
        for (const sticker of globalThis.stickers) {
          stickersDropdown.push({
            name: `<img src="${Sticker(sticker.id, sticker.format_type === 4)}" style="width: 5em!important; height: 5em!important;" /> ${sticker.name}`,
            value: sticker.id,
            selected: true
          })
        }

        $('#sticker-select').dropdown({
          values: stickersDropdown,
          placeholder: 'Select Stickers',
          onChange: (value, text, $selected) => {
            $('#stickercount').text(
              `(${$("input[name='stickers']").val().split(',').length}/${globalThis.stickers.length})`
            )
          }
        })
        $('#emojis').show()
        if (emojisDropdown2.length > 0) $('#emojis2').show()
        if (stickersDropdown.length > 0) $('#stickers').show()
        $('.active.dimmer').remove()
      }
    })
    $('#default-1').attr('data-tab', 'default-hide')
    $('#default-2').attr('data-tab', 'default')
    $.tab('change tab', 'default')
  })

  $('#default-2 #submit').click(async (e) => {
    e.preventDefault()
    if (!globalThis.emojis.length && !globalThis.stickers.length) { return error('Please select at least one emoji or sticker.') }
    try {
      if (globalThis.guild.emojis.length < 1 && globalThis.guild.stickers.length < 1) { return error("This server doesn't have any emojis or stickers!") }
      const cleanGuildName = globalThis.guild.name
        .replace(/\s/g, '_')
        .replace(/\W/g, '')
      console.log('Emojis:', globalThis.emojis.length)
      show('#loading')
      const renamedEmoji = renameEmoji(globalThis.emojis)
      const zip = new JSZip()
      const logoUrl = `https://cdn.discordapp.com/icons/${globalThis.guild.id}/${globalThis.guild.icon}.png`
      let logoRes
      try {
        logoRes = await fetch(logoUrl).then((logoRes) => logoRes.blob())
      } catch {
        console.log('Logo blocked by CORS, trying proxy')
        logoRes = await fetch(`https://corsproxy.io/?${logoUrl}`).then((logoRes) => logoRes.blob())
      }
      zip.file('logo.png', logoRes)
      const emojiFolder = zip.folder('Emojis')
      const stickerFolder = zip.folder('Stickers')
      let emojiCount = 0
      for (const i in renamedEmoji) {
        let res
        try {
          res = await fetch(
            Emoji(renamedEmoji[i].id, renamedEmoji[i].animated)
          ).then((res) => res.blob())
        } catch {
          console.log(`Emoji ${renamedEmoji[i].id} blocked by CORS, trying proxy`)
          res = await fetch(
            `https://corsproxy.io/?${Emoji(renamedEmoji[i].id, renamedEmoji[i].animated)}`
          ).then((res) => res.blob())
        }
        emojiFolder.file(
          `${renamedEmoji[i].name}.${renamedEmoji[i].animated ? 'gif' : 'png'}`,
          res
        )
        emojiCount++
      }

      const renamedStickers = globalThis.stickers
      let stickerCount = 0
      for (const i in renamedStickers) {
        let res
        const isGif = renamedStickers[i].format_type === 4
        try {
          res = await fetch(Sticker(renamedStickers[i].id, isGif)).then((res) =>
            res.blob()
          )
        } catch {
          console.log(`Sticker ${renamedStickers[i].id} blocked by CORS, trying proxy`)
          res = await fetch(
            `https://corsproxy.io/?${Sticker(renamedStickers[i].id, isGif)}`
          ).then((res) => res.blob())
        }
        stickerFolder.file(
          `${renamedStickers[i].name}.${isGif ? 'gif' : 'png'}`,
          res
        )
        stickerCount++
      }

      $('#success-msg #emoji-count').text(emojiCount)
      $('#success-msg #sticker-count').text(stickerCount)
      show('#success')
      // Insert downloadBtn and attach the common download handler
      $('#default-2 #submit').after(downloadBtn)
      attachDownloadHandler(zip, cleanGuildName)
    } catch (err) {
      return error(err)
    }
  })

  $('#manual #submit').click(async (e) => {
    e.preventDefault()
    const code = editor.getSession().getValue()
    if (!code) return error('You should probably get some code in there.')
    // NOPMD UnnecessaryBlock - this block is intentionally used
    try {
      const guild = JSON.parse(code)
      if (!guild.id) {
        return error('Your code seems off... are you sure you pasted the guild object?')
      }
      if (!guild.emojis) return error("I couldn't find the emojis object.")
      if (guild.emojis.length < 1) return error("This server doesn't have any emojis!")

      const cleanGuildName = guild.name.replace(/\s/g, '_').replace(/\W/g, '')
      console.log('Emojis:', guild.emojis.length)
      show('#loading')
      const renamedEmoji = renameEmoji(guild.emojis)
      const zip = new JSZip()
      const emojiFolder = zip.folder('Emojis')
      const stickerFolder = zip.folder('Stickers')
      let emojiCount = 0
      for (const i in renamedEmoji) {
        const res = await fetch(
          Emoji(renamedEmoji[i].id, renamedEmoji[i].animated)
        ).then((res) => res.blob())
        emojiFolder.file(
          `${renamedEmoji[i].name}.${renamedEmoji[i].animated ? 'gif' : 'png'}`,
          res
        )
        emojiCount++
      }

      let stickerCount = 0
      for (const i in guild.stickers) {
        const res = await fetch(Sticker(guild.stickers[i].id)).then((res) =>
          res.blob()
        )
        stickerFolder.file(`${guild.stickers[i].name}.png`, res)
        stickerCount++
      }

      $('#success-msg #emoji-count').text(emojiCount)
      $('#success-msg #sticker-count').text(stickerCount)
      show('#success')
      $('#manual #submit').after(downloadBtn)
      attachDownloadHandler(zip, cleanGuildName)
    } catch (err) {
      return error('Recheck your code, it threw some syntax errors.', err)
    }
  })

  function show (id) {
    $('#messages div.message').hide()
    $(id).fadeIn('slow').css('display', 'inline-flex')
  }

  function error (message, ...args) {
    console.error(message, ...args)
    $('button').removeClass('loading')
    $('#error-msg').text(message)
    show('#error')
  }

  function renameEmoji (emojis) {
    if (!emojis) return console.error('No Emojis Array')
    const emojiCountByName = {}
    const disambiguatedEmoji = []
    const customEmojis = {}
    const emojisByName = {}
    const emojisById = {}

    const disambiguateEmoji = (emoji) => {
      const originalName = emoji.name
      const existingCount = emojiCountByName[originalName] || 0
      emojiCountByName[originalName] = existingCount + 1
      if (existingCount > 0) {
        const name = `${originalName}~${existingCount}`
        emoji = {
          ...emoji,
          name,
          originalName
        }
      }

      emojisByName[emoji.name] = emoji
      if (emoji.id) {
        emojisById[emoji.id] = emoji
        customEmojis[emoji.name] = emoji
      }
      disambiguatedEmoji.push(emoji)
    }
    emojis.forEach(disambiguateEmoji)
    return disambiguatedEmoji
  }
})
