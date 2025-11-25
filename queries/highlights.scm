[ "export"
  "thread"
  "section"
  "align"
  "type"
  "data"
  "env"
  ] @keyword

"function" @keyword.function

[ (base_type)
  (extended_type)
  (sub_word_type)
  ] @type.builtin

(aggregate) @type

(comment) @comment 

"=" @operator

(global) @variable

(temporary) @variable
(label) @constant

(instruction_name) @function.builtin

[ "jmp"
  "jnz"
  "ret"
  "hlt"
  "phi"
  "call"
  ] @keyword.control

[ (number) (integer) (floating_point) ] @number
