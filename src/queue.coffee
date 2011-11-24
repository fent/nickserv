module.exports = (worker) ->
  workers = 0
  tasks = []
  q =
    push: (data) ->
      tasks.push data
      q.process()

    process: ->
      if workers is 0
        workers++
        worker tasks.shift(), ->
          workers--
          if tasks.length
            q.process()

    length: -> tasks.length
    running: -> workers

  q
