The monthly BLS Producer Price Index refresh (series WPU1361) picked up a new
reading. Material prices are anchored to a date and carried forward on this
index, so merging moves every published price by whatever the index moved.

The built site for this reading is attached to the workflow run as
`homecostdoctor-static` — download it, extract into `public_html`, and the live
site matches this branch.

Worth a glance before merging:

- the size of the move (a percent is routine, ten is not)
- that the latest reading's month is the one you expect
- that no material anchor postdates the index, which would mean nothing
  actually escalated
