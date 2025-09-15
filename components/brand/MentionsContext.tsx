'use client'
import * as React from 'react'

export type MentionsCtx = { isMentions: boolean; brandId?: string }
const defaultValue: MentionsCtx = { isMentions: false }

export const MentionsContext = React.createContext<MentionsCtx>(defaultValue)
export const useMentionsContext = () => React.useContext(MentionsContext)