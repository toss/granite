package com.teleport.host

internal class PortalContentLayoutObservation(
  host: PortalHostView,
  requestKey: String,
  revision: Int,
  onReady: () -> Unit,
) : AutoCloseable {
  override fun close() = Unit
}
