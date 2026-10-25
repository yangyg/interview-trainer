<script setup lang="ts">
import type { DialogRootEmits, DialogRootProps } from "reka-ui"
import { DialogClose, useForwardPropsEmits } from "reka-ui"
import { XIcon } from "@lucide/vue"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import Command from "./Command.vue"

const props = withDefaults(defineProps<DialogRootProps & {
  title?: string
  description?: string
  /** 透传给内部 Command 的自定义过滤函数 */
  filterFunction?: (value: string, search: string) => number
}>(), {
  title: "Command Palette",
  description: "Search for a command to run...",
})
const emits = defineEmits<DialogRootEmits>()

const forwarded = useForwardPropsEmits(props, emits)
</script>

<template>
  <Dialog v-slot="slotProps" v-bind="forwarded">
    <DialogContent :show-close-button="false" class="overflow-hidden p-0">
      <DialogHeader class="sr-only">
        <DialogTitle>{{ title }}</DialogTitle>
        <DialogDescription>{{ description }}</DialogDescription>
      </DialogHeader>
      <Command :filter-function="props.filterFunction" class="relative [&_[data-slot=command-input]]:pr-10">
        <slot v-bind="slotProps" />
        <DialogClose
          as-child
        >
          <button
            type="button"
            aria-label="关闭搜索"
            class="absolute top-1 right-1.5 z-10 flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors outline-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <XIcon class="size-4" />
          </button>
        </DialogClose>
      </Command>
    </DialogContent>
  </Dialog>
</template>
