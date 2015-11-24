#!/usr/bin/env node

var path = require('path')
var fs = require('fs')
var localize = path.join.bind(path, path.join(__dirname, '..', '..', '..'))
var portfinder = require('portfinder')
var pkg = require(localize('package.json'))
var exec = require('child_process').exec
var through = require('through2')
var ip = require('ip')

exec('deck-path', function (err, deckPath) {
  if (err) {
    console.error(err)
    return process.exit(1)
  }
  var present = require(path.join((deckPath + '').trim(), 'node_modules', '@deck', 'presenter'))
  var skin

  if (pkg.skin) {
    try { skin = require.resolve(pkg.skin) } catch (e) {}
  }

  var skinmages = path.join(path.dirname(skin), 'images')

  var images = [
    fs.existsSync(localize('images')) ? localize('images') : false,
    fs.existsSync(skinmages) ? skinmages : false
  ].filter(Boolean)

  portfinder.basePort = 2000
  portfinder.getPort(function (err, port) {
    if (err) {
      return console.error(err)
    }
    portfinder.basePort = 35729
    portfinder.getPort(function (err, lrPort) {
      if (err) {
        return console.error(err)
      }
      var deck = present({
        objectMode: true,
        title: titlelize(pkg.name),
        deck: localize('deck.md'),
        images: JSON.stringify(images),
        code: fs.existsSync(localize('code')) ? localize('code') : null,
        skin: skin,
        connect: {
          root: 'dist',
          port: port,
          livereload: {
            port: lrPort
          }
        }
      })
      deck
        .pipe(through.obj(function (obj, enc, cb) {
          if (obj && 'port' in obj) {
            if (+obj.port !== port) {
              return cb(Error('Port mismatch, should be ' + port + ', got' + obj.port))
            }

            obj.ip = ip.address()
            obj.url = 'http://' + obj.ip + ':' + port
            obj.pids = [deck.pid]
          }

          cb(null, obj ? JSON.stringify(obj) : '\n')
        }))
        .pipe(process.stdout)
    })
  })

  function titlelize (name) {
    name = name.replace(/-deck$/, '')
    return ((/\//.test(name) ? name.split('/')[1] : name)
      .split('-').join(' ').replace(/\w\S*/g,
      function (n) {
        if (n === 'and' || n === 'with') { return n }
        return n.charAt(0).toUpperCase() + n.substr(1)
      }))
  }
})
