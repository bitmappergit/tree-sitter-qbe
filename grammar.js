/**
 * @file Tree-sitter parser for QBE Intermediate Language.
 * @author Robin Wyllie
 * @license MIT
 */

/// <reference types="tree-sitter-cli/dsl" />
// @ts-check

function commaSep1(rule) {
    return seq(rule, repeat(seq(',', rule)))
}

function commaSep(rule) {
    return optional(commaSep1(rule))
}

function braces(rule) {
    return seq("{", rule, "}")
}

function parentheses(rule) {
    return seq("(", rule, ")")
}

module.exports = grammar({
    name: "qbe",

    extras: $ => [
        /\s/,
        $.comment,
    ],

    conflicts: $ => [
        [$._performing_instruction],
        [$._producing_instruction],
        [$.phi],
    ],
    
    rules: {
        source_file: $ => repeat($.definition),

        comment: $ => token(seq("#", /.*/)),
        
        number: $ => /\d+/,
        integer: $ => /\-?\d+/,
        floating_point: $ => /\-?[0-9]+\.[0-9]+[eE]\-?[0-9]+/,
        identifier: $ => /[a-zA-Z._]+/,

        aggregate: $ => /:[a-zA-Z._][a-zA-Z0-9._]*/,
        global: $ => /\$[a-zA-Z._][a-zA-Z0-9._]*/,
        temporary: $ => /%[a-zA-Z._][a-zA-Z0-9._]*/,
        label: $ => /@[a-zA-Z._][a-zA-Z0-9._]*/,

        base_type: $ => choice(
            "w",
            "l",
            "s",
            "d",
        ),
        
        extended_type: $ => choice(
            $.base_type,
            "b",
            "h",
        ),

        constant: $ => choice(
            $.integer,
            seq("s_", $.floating_point),
            seq("d_", $.floating_point),
            $.global,
        ),

        dynamic_constant: $ => choice(
            $.constant,
            seq("thread", $.global),
        ),

        value: $ => choice(
            $.dynamic_constant,
            $.temporary,
        ),

        _string: $ => /"[^"]*"/,
        
        section_name: $ => $._string,
        section_flags: $ => $._string,
        
        linkage: $ => choice(
            "export",
            "thread",
            seq("section", $.section_name, optional($.section_flags)),
        ),

        sub_type: $ => choice($.extended_type, $.aggregate),

        alignment: $ => seq("align", $.number),

        structure: $ => braces(commaSep(seq($.sub_type, optional($.number)))),
        
        regular_type: $ => seq(
            optional($.alignment), $.structure,
        ),

        union_type: $ => seq(
            optional($.alignment), braces(repeat1($.structure)),
        ),

        opaque_type: $ => seq(
            $.alignment, braces($.number),
        ),
        
        type_definition: $ => seq(
            "type", $.aggregate, "=", choice(
                $.regular_type,
                $.union_type,
                $.opaque_type,
            ),
        ),

        data_item: $ => choice(
            seq($.global, "+", $.number),
            $._string,
            $.constant,
        ),
        
        data_definition: $ => seq(
            repeat($.linkage),
            "data", $.global, "=", optional($.alignment), braces(
                commaSep(
                    choice(
                        seq($.extended_type, repeat1($.data_item)),
                        seq("z", $.number)
                    ),
                ),
            ),
        ),

        sub_word_type: $ => choice(
            "sb",
            "ub",
            "sh",
            "uh",
        ),
        
        abi_type: $ => choice(
            $.base_type,
            $.sub_word_type,
            $.aggregate,
        ),

        parameter: $ => choice(
            seq($.abi_type, $.temporary),
            seq("env", $.temporary),
            "...",
        ),
        
        function_definition: $ => seq(
            repeat($.linkage),
            "function", optional($.abi_type), $.global, parentheses(commaSep($.parameter)), braces(
                repeat1($.block)
            ),
        ),
        
        definition: $ => choice(
            $.function_definition,
            $.type_definition,
            $.data_definition,
        ),

        block: $ => seq(
            field("label", $.label),
            repeat($.phi),
            repeat($.instruction),
            optional($.jump)
        ),

        instruction_name: $ => choice(
            "add",
            "sub",
            "div",
            "mul",
            "udiv",
            "rem",
            "urem",
            "or",
            "xor",
            "and",
            "sar",
            "shr",
            "shl",
            /alloc(4|8|16)/,
            "blit",
            /load([wlsd]|[us][bhw])/, // (sh)(sw)(ub)(uh)(uw)]/, // d", "l", "s", "sb", "sh", "sw", "ub", "uh", "uw", "w")),
            /store[bdhlsw]/, // seq("store", choice("b", "d", "h", "l", "s", "w")),
            /ceq[dlsw]/, //seq("ceq", choice("d", "l", "s", "w")),
            // /c[(ge)(gt)(le)(lt)o(uo)][ds]/, // (co//seq(choice("cge", "cgt", "cle", "clt", "co", "cuo"), choice("d", "s")),
            /cne[dlsw]/, //seq("cne", choice("d", "l", "s", "w")),
            /c[su][gl][et][lw]/, //seq(choice("csge", "csgt", "csle", "cslt", "cuge", "cugt", "cule", "cult"), choice("l", "w")),
            "dtosi",
            "dtoui",
            /ext(s|[su][bhw])/, //seq("ext", choice("s", "sb", "sh", "sw", "ub", "uh", "uw")),
            "sltof",
            "ultof",
            "stosi",
            "stoui",
            "swtof",
            "uwtof",
            "truncd",
            "cast",
            "copy",
            "vastart",
            "vaarg",
        ),

        _producing_instruction: $ => seq(
            field("target", $.temporary),
            "=",
            field("result_type", $.base_type),
            field("name", $.instruction_name),
            field("arguments", commaSep($.value)),
        ),

        _performing_instruction: $ => seq(
            field("name", $.instruction_name),
            field("arguments", commaSep($.value)),
        ),
        
        instruction: $ => choice(
            $._producing_instruction,
            $._performing_instruction,
            $.call,
        ),
        
        jump: $ => choice(
            seq("jmp", $.label),
            seq("jnz", $.value, ",", $.label, ",", $.label),
            seq("ret", optional($.value)),
            "hlt",
        ),

        argument: $ => choice(
            seq($.abi_type, $.value),
            seq("env", $.value),
            "...",
        ),
        
        call: $ => seq(
            optional(seq($.temporary, '=', $.base_type)), "call", $.value, parentheses(commaSep($.argument))
        ),
        
        phi: $ => seq(
            field("target", $.temporary),
            "=",
            field("result_type", $.base_type),
            "phi",
            field("branches", commaSep(seq($.label, $.value))),
        ),
    }
});
