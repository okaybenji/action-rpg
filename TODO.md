## TODO
* Compensate for length of sword when player attacks west or north
* Eliminate bug which occasionally causes player animation to stick
* Eliminate occasional hiccup in position reconciliation
* Interpolate player to server recon position
* Broadcast and interpolate positions of other players
* Consider allowing 360 degrees player rotation
* Allow players to attack each other
* Implement lag compensation. Rather than broadcasting player positions, broadcast input histories of players to each other and play them back at a constant 100ms in the past, interpolating between each input.

## MISC
* Figure this out: If you sample input every input sample tick rather than only if the input has changed and keep the input sample tick at 25 times per second, when you move the player rightward or downward the server only reconciles at the beginning or ending of the movement and the movement is smooth, but if you move the player leftward or upward, reconciling happens every server tick and the movement is jerky. However, setting the input sample rate at 60 samples per second, movement is smooth in any direction. This seems to have something to do with the upload tick rate -- if the same rate is evenly divisible by the upload rate, less reconciliation is necessary. Amazingly, at 6 samples per second and 6 uploads per second, it seems reconciliation is never necessary.

## NOTES