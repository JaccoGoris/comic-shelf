import { Button, createPolymorphicComponent } from '@mantine/core'
import type { ButtonProps } from '@mantine/core'
import { forwardRef } from 'react'
import { ACTION_BUTTON_WIDTH } from '../../utils/constants'

const _CSButton = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { justify, miw = ACTION_BUTTON_WIDTH, leftSection, rightSection, ...props },
    ref
  ) => {
    const resolvedJustify =
      justify ?? (leftSection || rightSection ? 'space-between' : 'center')
    return (
      <Button
        ref={ref}
        justify={resolvedJustify}
        miw={miw}
        leftSection={leftSection}
        rightSection={rightSection}
        {...props}
      />
    )
  }
)
_CSButton.displayName = 'CSButton'

export const CSButton = createPolymorphicComponent<'button', ButtonProps>(
  _CSButton
)
